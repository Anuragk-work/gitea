# Releases, Wiki & Projects

Three repository-attached features share a common shape — each layers domain logic in
`services/` on top of a data model documented in
[Repository Model](../05-database-models/repository-model.md): **releases** (tags with
optional binary attachments and rendered notes), the **wiki** (a second bare git repository per
repo), and **projects** (Kanban-style issue/PR boards that can be scoped to a repo, an
organization, or an individual user). This page covers the service layer for all three:
`services/release`, `services/wiki`, and `services/projects`.

## Releases — `services/release`

### Creating a release (`CreateRelease`, `release.go`)

1. Checks `(RepoID, TagName)` doesn't already exist (`repo_model.IsReleaseExist`) —
   `ErrReleaseAlreadyExist` otherwise.
2. Delegates to the shared `createTag` helper (below) to create the underlying git tag if the
   release isn't a draft.
3. Truncates the title to 255 chars (`util.EllipsisDisplayString`), inserts the `Release` row,
   attaches any pre-uploaded attachments by UUID (`repo_model.AddReleaseAttachments`).
4. Fires `notify_service.NewRelease` unless the release is a draft (drafts are invisible until
   published, so they generate no notifications/webhooks yet).

### The `createTag` helper — where releases and git tags meet

`createTag` is the crux of the releases feature: it is called both by `CreateRelease` and by
`UpdateRelease`/`CreateNewTag`, and it enforces the rule that **you cannot draft a git tag** — a
tag object is only created in git once the release stops being a draft:

- Refuses to act on an archived repository (`repo.MustNotBeArchived()`).
- If the tag doesn't already exist in git, validates against tag-protection rules
  (`git_model.GetProtectedTags`, `IsUserAllowedToControlTag`) before creating it —
  `ErrProtectedTagName` if the publisher isn't allowed to write that tag pattern.
- Strips a leading `--` from the tag name to defend against argument-injection into the
  underlying `git tag` command.
- Creates an annotated tag (with the release/tag message) or a lightweight tag depending on
  whether a message was supplied, then synthesizes the same `PushCommits`/`CreateRef`
  notifications a real `git push --tags` would generate, so the activity feed, webhooks, and
  Actions triggers all see a tag creation event that matches what actually happened.
- Always (re)computes `Sha1` (the resolved commit) and `NumCommits` (commit count reachable from
  the tag) from the git tag object, even when the tag already existed — this keeps stale/derived
  columns honest whenever a release is edited.

### Pure git tags vs. releases — `CreateNewTag`

Pushing a plain git tag (no release notes) also produces a `Release` row, but with `IsTag: true`
and no `Title`/`Note` — this is what backs the separate "Tags" list in the UI. `CreateNewTag`
constructs exactly this kind of row and reuses `createTag` to do the actual git-level work,
keeping tag creation semantics (protection checks, notifications) identical whether it originates
from the "New Tag" UI or the "New Release" UI.

### Updating and converting — `UpdateRelease`

- Re-runs `createTag` (a no-op at the git level if the tag already exists, unless the release
  was previously a draft — in which case this is the point where the tag is actually created).
  `isConvertedFromTag` detects the case where a plain tag row is being "promoted" to a full
  release (`IsTag: true → false`), which routes to a `NewRelease` notification instead of
  `UpdateRelease` (semantically, this is the first time the release becomes visible).
- Reconciles attachments in one transaction: adds newly uploaded UUIDs, deletes UUIDs the caller
  removed (with an ownership check against `rel.ID` to prevent cross-release attachment
  deletion), and renames attachments (validated against
  `setting.Repository.Release.AllowedTypes` via the upload package). Deleted attachment blobs are
  removed from storage only after the DB transaction commits.

### Deleting — `DeleteReleaseByID`

Two distinct outcomes depending on `delTag`:

- **`delTag = true`** — actually deletes the underlying git tag (`git tag -d`, after the same
  tag-protection check used on creation), emits `PushCommits`/`DeleteRef` notifications with the
  tag's old SHA and the empty-object-ID as the "new" commit, and removes the `Release` row
  entirely.
- **`delTag = false`** — demotes the release back to a plain tag (`IsTag = true`) instead of
  removing the row, since the git tag itself should remain. This is the "delete this release but
  keep the tag" option in the UI.

Either way, release attachments are deleted from both DB and storage, and (unless the release was
a draft) `notify_service.DeleteRelease` fires.

### Release notes generation — `notes.go`

`GenerateReleaseNotes` auto-drafts a Markdown release-notes body between two refs: it resolves
the head commit for the target tag, walks `CommitsBetween` the previous tag (or from the
beginning of history for the very first release, detected via `repoReleaseIsEmpty`), and
collects merged pull requests referenced by those commits (`collectPullRequestsFromCommits`) to
build a categorized "What's Changed" summary — the same mechanism GitHub-style "Generate release
notes" buttons use.

### Tag synchronization queue — `tag.go`

`services/release/tag.go` runs a dedicated worker-pool queue (`tag_sync`) that calls
`repo_module.SyncRepoTags` for a given `RepoID` — reconciling the `Release` table against
whatever tags actually exist in git (covering drift from direct git pushes, mirror syncs, or
migrations). `AddAllRepoTagsToSyncQueue` seeds the queue for every non-empty repository, typically
run once after a schema/behavior change that affects tag-derived data. `release.Init()` starts
this queue at application boot.

## Wiki — `services/wiki`

The wiki is **not** a database table — it is a second bare git repository per repo
(`<owner>/<repo>.wiki.git`, see `Repository.WikiStorageRepo()`), so almost every wiki service
function is really a small, careful git-scripting routine performed against that repo.

### Initialization — `InitWiki`

Idempotent: checks whether the wiki git directory already exists
(`gitrepo.IsRepositoryExist`) and, if not, `git init`s it, installs Gitea's server-side hooks
(`gitrepo.CreateDelegateHooks`), and sets its default branch to `Repository.DefaultWikiBranch`.
Called lazily by every write path below rather than eagerly at repo-creation time, since many
repositories never use their wiki.

### Locating pages — `prepareGitPath`

Wiki page names are user-facing strings (e.g. `"Home"`, `"API Docs"`) that must map onto safe git
file paths (`WebPathToGitPath`, in `wiki_path.go`) while tolerating both the old (`Page.md`) and
percent-escaped git-path (`Page-Name.md`-style) conventions that have existed across Gitea
versions — `prepareGitPath` checks the git index/tree for both candidate filenames via a single
`gitRepo.LsTree` call and returns which one (if either) actually exists.

### Writing a page — `updateWikiPage` (shared by `AddWikiPage` / `EditWikiPage`)

Both "create" and "edit" funnel through one function (with an `isNew` flag) that:

1. Refuses on an archived repo (`repo.MustNotBeArchived()`) and validates the target path
   (`validateWebPath`).
2. Takes a per-repo lock (`wiki_working_<id>`) so concurrent wiki edits can't race on the same
   underlying clone/commit/push cycle, then ensures the wiki exists (`InitWiki`).
3. Clones the wiki bare repo to a **temporary local working copy** (`--shared`, so git can reuse
   object storage rather than copying it) — all mutation happens against loose objects/index in
   this temp copy, never directly against the bare repo.
4. For a rename (`oldWikiName != newWikiName`), removes the old path from the index; for a new
   page, rejects if the target already exists (`ErrWikiAlreadyExist`).
5. Hashes the new content directly into a git blob (`HashObjectBytes` +
   `AddObjectToIndex`) — content never touches the filesystem outside of git's object store —
   writes the tree, and commits with the doer as author. If commit signing is configured
   (`asymkey_service.SignWikiCommit`), the commit is GPG-signed and the committer identity may be
   swapped to the server signer depending on the repo's trust model.
6. Pushes the new commit from the temporary local clone back into the wiki's bare repo
   (`gitrepo.PushFromLocal`), surfacing `ErrPushOutOfDate`/`ErrPushRejected` distinctly so the UI
   can prompt for a concurrent-edit conflict rather than showing a generic error.

### Deleting a page / the whole wiki

`DeleteWikiPage` mirrors `updateWikiPage`'s clone → mutate-index → commit → push structure but
removes the page's blob from the index instead of adding one. `DeleteWiki` is a much coarser
operation: it disables the `TypeWiki` repo unit and deletes the entire wiki git directory from
storage — used when a repository's wiki is disabled outright or the parent repository is deleted.

### Changing the default wiki branch — `ChangeDefaultWikiBranch`

Validates the new branch name (`git.IsValidRefPattern`), persists
`Repository.DefaultWikiBranch`, and — if a wiki already exists — renames the actual git branch
inside the wiki repo to match, keeping the DB column and the git ref in sync.

## Projects — `services/projects`

Gitea's "Projects" feature is a Kanban board (`Project` + `Column` + a `project_issue` join
table mapping issues/PRs to `(ProjectID, ColumnID, sorting)`). Unlike releases and the wiki,
projects have **no git-level component at all** — everything lives in the relational model
(`models/project`), and `services/projects` is purely an orchestration layer over issue↔column
assignment and per-project counters.

### Scopes

A `Project.Type` is one of `TypeIndividual`, `TypeRepository`, or `TypeOrganization`
(`models/project/project.go`) — the same board mechanics apply regardless of scope, but a
repository-scoped project (`OwnerID == 0`, tied to a `RepoID`) only ever surfaces issues from
that one repository, while org/individual-scoped projects can span multiple repositories via the
same `project_issue` join table.

### Moving issues between columns — `MoveIssuesOnProjectColumn`

Given a target `Column` and a map of `issueID → sorting position`:

1. Validates every issue ID is *already* assigned to this project
   (`count(project_issue where project_id=... and issue_id in (...))` must equal the number of
   IDs supplied) — you cannot use this call to add an issue to a project, only to reorder/move
   ones already on the board.
2. Loads the issues (with their repositories, for permission/notification context) and the
   project.
3. For each issue, compares its **current** column for this specific project
   (`Issue.ProjectColumnMap`) against the destination column; if it's actually moving (not just
   being re-sorted within the same column), inserts a `CommentTypeProjectColumn` timeline comment
   recording the column change (so the issue's activity history shows "moved to column X").
4. Updates `project_issue.project_board_id` and `sorting` directly via the query builder — the
   whole operation runs inside a single `db.WithTx` so a drag-and-drop reorder of many cards is
   atomic.

The `WHERE issue_id = ? AND project_id = ?` clause is deliberately scoped to both columns because
the same issue can be attached to multiple projects simultaneously (e.g. a repo project and an
org-wide project) — moving it on one board must never affect its position on another.

### Reading a board — `LoadIssuesFromProject`

Loads all issues for a project sorted by `project-column-sorting`, loads their comments (needed
for card previews), resolves a fallback "default column" (`Project.MustDefaultColumn` — used for
issues assigned to the project but not yet dragged into a specific column), and buckets issues
into a `map[columnID][]Issue` ready for the board template to render.

### Counters — `LoadIssueNumbersForProject(s)`

`loadNumOpenIssues` / `loadNumClosedIssues` compute per-project open/closed issue counts with a
plain join+count query against `project_issue` ⋈ `issue`. These are computed on demand (not
denormalized columns like `Repository.NumOpenIssues`) because a project's issue set is inherently
cross-cutting and harder to keep incrementally in sync than a single repository's counters.

### Assignee roster — `LoadIssuesAssigneesForProject`

A small but frequently-used helper: returns the distinct set of users assigned to any issue on
the project (via `project_issue ⋈ issue_assignees ⋈ user`), sorted by name — this powers the
"filter by assignee" control on the board view without requiring a separate assignee-tracking
table on `Project` itself.

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the `Release`, `Mirror`, `PushMirror`, and `Repository.Units` schema | [Repository Model](../05-database-models/repository-model.md) |
| See how a repo transitions through creation/migration/archive/delete | [Repository Lifecycle](repository-lifecycle.md) |
| See the REST API surface for releases/wiki/projects | [REST API v1 Overview](../07-rest-api/api-v1-overview.md) |
| See webhook payloads fired by release/push events | [Webhook Event Types & Payloads](../16-webhooks-integrations/webhook-event-types-and-payloads.md) |
