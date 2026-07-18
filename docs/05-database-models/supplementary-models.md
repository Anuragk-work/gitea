# Supplementary Models

The four entity-focused pages in this section ([Repository](repository-model.md),
[Issues & Pull Requests](issues-and-pulls-model.md), [User & Organization](user-organization-model.md),
and [Permissions](permissions-model.md)) cover the "core" of Gitea's domain model. This page
rounds out the picture by covering every other `models/*` package that has its own tables but
doesn't warrant (or is already covered by) a dedicated page: cryptographic keys, avatars, the
database-backed virtual filesystem, git-identity/commit-participant matching, projects (kanban
boards), pull-request auxiliary state, markup rendering helpers, secrets, shared types, instance
settings/state, repo units, webhooks, admin tasks, activity feed/notifications, actions, packages,
and git-specific metadata (branches, protection, LFS, commit statuses).

> Source of truth for this page: `models/asymkey/`, `models/avatars/`, `models/dbfs/`,
> `models/gituser/`, `models/project/`, `models/pull/`, `models/renderhelper/`,
> `models/secret/`, `models/shared/types/`, `models/system/`, `models/unit/`,
> `models/webhook/`, `models/admin/`, `models/activities/`, `models/actions/`,
> `models/packages/`, and `models/git/`.

## `models/asymkey` — GPG & SSH Keys

Two independent-but-parallel key subsystems, both used to verify signed commits/pushes and to
authenticate SSH access:

- **`GPGKey`** (`gpg_key.go`) — a user's registered GPG public key. Stores the raw armored key
  content, parsed sub-key IDs, fingerprint, and expiry. `gpg_key_commit_verification.go`
  implements `ParseCommitWithSignature`, which checks a commit's PGP signature against the
  committer's (or any collaborator's) registered keys and produces a `CommitVerification`
  (`verified`, `warning`, `trust level`) consumed by the web UI's "Verified" badge.
- **`PublicKey`** / **`DeployKey`** (`ssh_key.go`, `ssh_key_deploy.go`) — SSH public keys.
  `PublicKey.Type` distinguishes user keys (`KeyTypeUser`) from repository-scoped deploy keys
  (`KeyTypeDeployKey`) and CI-principal keys (`KeyTypePrincipal`). `ssh_key_authorized_keys.go`
  regenerates the SSH server's `authorized_keys` file from the `public_key` table (invoked
  whenever a key is added/removed, and by `gitea admin regenerate keys`).
- `ssh_key_fingerprint.go` / `ssh_key_parse.go` — fingerprint calculation and OpenSSH-format
  parsing, shared by both deploy keys and regular keys.

## `models/avatars` — Avatar Resolution

Not a heavyweight model — mainly a small **`EmailHash`** cache table
(`Hash` → `Email`, used so Gravatar/Libravatar URLs built from an MD5 hash can be reversed back
to an email for admin lookups) plus a large set of pure functions for building avatar URLs:

- `GenerateUserAvatarImageLink` / `GenerateUserAvatarFastLink` — links to a locally-uploaded
  user avatar file (`User.Avatar`) vs. a redirect-based lookup by username.
- `GenerateEmailAvatarFastLink` / `GenerateEmailAvatarFinalLink` — Gravatar/Libravatar
  federated-avatar resolution, split into a "fast" (redirect, cheap) and "final" (may perform a
  DNS lookup for Libravatar) variant so page rendering never blocks on external DNS.
- `loadAvatarSetting()` caches parsed `GravatarSource` URL + a configured `libravatar.Libravatar`
  client behind an `atomic.Pointer`, invalidated whenever `setting.GravatarSource` changes.

## `models/dbfs` — Database-Backed Filesystem

A niche but important package: it implements a `fs.File`-like interface (`Open`, `Create`,
`Rename`, `Remove`) entirely on top of two tables, so that **streamed, appendable data that must
work identically across a clustered/HA deployment** (primarily live Actions log output) doesn't
need a shared filesystem or object-storage round-trip per line:

```go
type dbfsMeta struct {
    ID              int64  `xorm:"pk autoincr"`
    FullPath        string `xorm:"VARCHAR(500) UNIQUE NOT NULL"`
    BlockSize       int64
    FileSize        int64
    CreateTimestamp int64
    ModifyTimestamp int64
}

type dbfsData struct {
    ID         int64  `xorm:"pk autoincr"`
    Revision   int64
    MetaID     int64  `xorm:"index(meta_offset)"`
    BlobOffset int64  `xorm:"index(meta_offset)"`
    BlobSize   int64
    BlobData   []byte `xorm:"BLOB NOT NULL"`
}
```

Data is chunked into fixed-size `BlockSize` blobs (`dbfsData` rows), keyed by `(MetaID,
BlobOffset)`, so random-access reads/seeks only need to fetch the relevant blocks rather than
the whole file. `dbfsMeta` implements `fs.FileInfo` directly (`Name`, `Size`, `ModTime`, etc.),
so callers can treat a dbfs file exactly like an `os.File` for most purposes. The package doc
comment in `dbfs.go` explicitly rejects the alternative designs (local temp files, git-repo
storage, one-row-per-log-line) and explains why: cluster-safety, shared read/write interface, and
avoiding big-table performance problems from a line-per-row schema.

## `models/gituser` — Git Identity ↔ Gitea User Matching

A small, read-only-in-nature helper package (not backed by its own tables) that reconciles git
commit authorship (`name <email>`) with registered Gitea accounts:

- `GetUserCommitsByGitCommits` takes a slice of `*git.Commit` and returns `[]*UserCommit`, each
  pairing the raw commit with the matched `*user.User` (matched by **author** email, gathered
  via `user.GetUsersByEmails`) — this is what lets the commit-log view show a Gitea avatar/link
  next to commits instead of a bare "Name <email>" string.
- `CommitParticipant` / `BuildAvatarStackData` (`avatar_stack.go`) extend this to *all*
  participants of a commit (author, committer, and co-authors parsed from trailers), producing
  the small overlapping-avatar "stack" widget shown in commit list rows and the "N people"
  tooltip.

## `models/project` — Projects (Kanban Boards)

`Project` (`project.go`) models a kanban-style board that can be scoped to an individual user,
an organization, or a single repository (`Type`: `TypeIndividual` / `TypeOrganization` /
`TypeRepository`), with `OwnerID`/`RepoID` set accordingly (mutually exclusive, mirroring the
`Secret` model's ownership convention below).

- `Column` (`column.go`) — one kanban column within a project (e.g. "To Do", "In Progress",
  "Done"); has a `Default` flag marking where newly-added issues land.
- `ProjectIssue` (`issue.go`) — the many-to-many join between `Issue` and `Project`/`Column`,
  also storing a `Sorting` position for drag-and-drop ordering within a column.
- `TemplateType`/`CardType` enums select the built-in column layout (e.g. "Basic Kanban",
  "Bug Triage") and card rendering style (text-only vs. cover-image) offered when creating a
  project.
- `GhostProjectID = -1` is a sentinel used the same way as Gitea's "ghost user" — for
  `ProjectIssue` rows whose parent project was deleted but the row wasn't cleaned up yet.

See also [Repository Model](repository-model.md) and
[Issues & Pull Requests Model](issues-and-pulls-model.md) for how `RepoID` and issue linkage work.

## `models/pull` — Pull Request Auxiliary State

Two tables that extend `issues.PullRequest` (documented in
[Issues & Pull Requests Model](issues-and-pulls-model.md)) without living in the `issues`
package itself, to avoid import cycles with `repo`/`user`:

- **`AutoMerge`** (`automerge.go`, table `pull_auto_merge`) — records that a PR is scheduled to
  merge automatically once its required checks pass; stores the requested `MergeStyle`, the
  merge commit `Message`, and whether to delete the branch afterward. One row per `PullID`
  (`UNIQUE`).
- **`ReviewState`** (`review_state.go`) — per-user, per-PR, per-commit "viewed files" tracking
  for the PR diff UI's "Viewed" checkboxes. `UpdatedFiles` is a `map[string]ViewedState` stored
  as JSON, where `ViewedState` is `Unviewed` / `HasChanged` (file changed since last viewed,
  cannot be set directly by the UI) / `Viewed`. Keyed by `(UserID, PullID, CommitSHA)` so that
  viewed-state correctly resets/carries forward as new commits are pushed to the PR.

## `models/renderhelper` — Markup Rendering Context Builders

Not database models — this package builds `*markup.RenderContext` + `markup.RenderHelper`
implementations for the four rendering surfaces that need repository-aware link/mention
resolution: `RepoComment` (issue/PR comments), `RepoFile` (README/markdown files in a repo tree),
`RepoWiki` (wiki pages), and `SimpleDocument` (context-free rendering, e.g. release notes preview).
Each implementation supplies `ResolveLink` (turning relative links into repo-relative URLs) and
`IsCommitIDExisting` (used to decide whether a `abcd1234`-looking string in text should be
auto-linked as a commit reference) — the latter backed by a shared `commitChecker` that batches
and caches git object lookups to avoid one git call per detected hash in a large comment/file.

## `models/secret` — Actions Secrets

**`Secret`** stores encrypted values used by Gitea Actions (`${{ secrets.X }}`) and, more
generally, anything needing owner/repo-scoped encrypted key-value storage. Its doc comment
(reproduced in the model) is the load-bearing design note:

- Exactly one of `OwnerID` (org/user-level secret) or `RepoID` (repo-level secret) must be
  non-zero — never both, and never neither (global secrets are deliberately unsupported for
  security reasons, so a misconfigured "global" secret can't silently leak to every repo).
- `Data` stores the value already encrypted (via `modules/secret`) before it ever reaches the
  database — the DB layer never sees plaintext secret values.
- `(OwnerID, RepoID, Name)` is a compound unique index, so the same secret name can exist once
  per owner and independently once per repo without colliding.
- Size limits are enforced in Go before insert: `SecretDataMaxLength = 65536`,
  `SecretDescriptionMaxLength = 4096`.

## `models/shared/types` — Cross-Package Enums

A tiny, dependency-free package that exists purely to break import cycles: `OwnerType` (`"system-
global"`, `"individual"`, `"repository"`, `"organization"`) is used by webhook, secret, variable,
and Actions-config models to tag *who* owns a row, without those packages needing to import each
other just to share one string enum. `OwnerType.LocaleString` renders each value through
`modules/translation` for admin UI displays.

## `models/system` — Instance-Wide Settings & State

- **`Setting`** (`setting.go`, table `system_setting`) — the persisted backing store for runtime-
  configurable settings (`SettingKey` → `SettingValue`), used by `modules/setting/config`'s
  dynamic-config layer (`system_model.NewDatabaseDynKeyGetter()`, wired up in
  `routers/common/db.go` and `models/unittest/testdb.go`) so certain settings can be changed from
  the admin UI without restarting the process. Has a `Version` column for optimistic locking
  (`xorm:"version"`) to avoid lost updates when the same key is written concurrently.
- **`AppState`** (`appstate.go`) — a generic `ID → Content` key-value table for small pieces of
  server state that aren't quite "settings" (e.g. a revision counter used by the mail queue and
  various one-time migration markers). `SaveAppStateContent` does an `UPDATE ... SET
  revision=revision+1` first and only falls back to `INSERT` if no row was updated, avoiding a
  read-then-write race.
- **`Notice`** (`notice.go`) — admin-facing system notices (shown on the "Notices" admin page),
  e.g. background task failures.

## `models/unit` — The Repository Feature-Unit Registry

Defines the `Type` enum consumed throughout [Permissions Model](permissions-model.md) and
[Repository Model](repository-model.md#repo-units--feature-toggle-system):
`TypeCode`, `TypeIssues`, `TypePullRequests`, `TypeReleases`, `TypeWiki`, `TypeExternalWiki`,
`TypeExternalTracker`, `TypeProjects`, `TypePackages`, `TypeActions`. It also defines the
per-type defaults consumed when creating a repo: `DefaultRepoUnits` (normal repo),
`DefaultForkRepoUnits` (forks default to just Code + Pull Requests), `DefaultMirrorRepoUnits`
(mirrors don't get Pull Requests or Actions), and `DefaultTemplateRepoUnits`. Each `Unit`
definition also carries a `MaxPerm()` cap (see the "Unit Types Recap" section of
[Permissions Model](permissions-model.md)).

## `models/webhook` — Webhook Configuration & Delivery Queue

`Webhook` and `HookTask` (with `HookRequest`/`HookResponse` sub-structs) are the persistence
layer behind Gitea's outbound webhook system — full coverage, including the delivery pipeline,
retry/backoff behavior, and payload formats for every supported event, lives in
[Webhooks & Integrations: Webhook Delivery Pipeline](../16-webhooks-integrations/webhook-delivery-pipeline.md)
and
[Webhook Event Types & Payloads](../16-webhooks-integrations/webhook-event-types-and-payloads.md).
This page only notes the model's place in the schema: `Webhook` rows are owned by exactly one of
a repository, an organization/user, or the system-wide default set (`ListSystemWebhookOptions`),
mirroring the `OwnerType` convention above; `HookTask` rows are the durable delivery queue,
one per (webhook, triggering event) pair, retained for a configurable window for debugging failed
deliveries.

## `models/admin` — Background Task Records

**`Task`** (table `task`) records long-running admin-triggered background jobs — primarily
repository **migrations** (`gitea migrate` / "New Migration" in the UI) — with `Doer`/`Owner`/
`Repo` references, a `structs.TaskType`/`structs.TaskStatus` state machine, start/end timestamps,
and a `PayloadContent` JSON blob holding the original migration options. `Message` stores a
human-readable failure reason, optionally itself a JSON-encoded `TranslatableMessage{Format,
Args}` so the admin UI can render it through `modules/translation` in the viewer's own locale
rather than baking in English at write time.

## `models/activities` — Activity Feed & Notifications

- **`Action`** (`action.go`) — the row behind every entry in a user's/org's/repo's public
  activity feed ("pushed to", "opened issue", "created pull request", etc.); `OpType` enumerates
  the feed event kinds, and `GetActFeeds`-style query helpers in `action_list.go` build the
  dashboard/user-profile/repo activity views.
- **`Notification`** (`notification.go`) — the row behind Gitea's in-app notification inbox
  (bell icon); full coverage of how these rows are created and surfaced lives in
  [Notifications: Notification Delivery & UINotification](../17-notifications/notification-delivery-and-uinotification.md).
- **`repo_activity.go`** / **`statistic.go`** / **`user_heatmap.go`** — read-only aggregate
  queries (not their own tables) that power the repository "Activity" graphs, instance-wide
  admin statistics, and the GitHub-style contribution heatmap on user profiles.

## `models/actions` — Gitea Actions (CI/CD) Persistence

The largest single supplementary package (21 files), backing the entire Actions subsystem:
`ActionRun`/`ActionRunAttempt`/`ActionRunJob`/`ActionTask`/`ActionTaskStep` (the run/job/step
hierarchy), `ActionRunner`/`ActionRunnerToken` (registered runner fleet), `ActionArtifact`
(build artifacts), `ActionVariable`/`ActionScopedWorkflowSource`/`ScopedWorkflowConfig` (Actions
variables and the scoped-workflow trust model), `ActionSchedule`/`ActionScheduleSpec` (`cron`-
triggered workflows), and `OwnerActionsConfig` (per-owner Actions enable/disable + retention
settings). Full architectural coverage — the run/job/step state machine, runner registration
protocol, and artifact storage flow — lives in
[Actions & CI: Actions Architecture](../14-actions-ci/actions-architecture.md); this page only
notes that these tables all live in `models/actions` alongside (but decoupled from) the core
repository/issue/user tables, joined only by `RepoID`/`OwnerID`/`DoerID` foreign keys.

## `models/packages` — Package Registry Persistence

`Package`/`PackageBlob`/`PackageFile`/`PackageProperty`/`PackageBlobUpload`/
`PackageCleanupRule`, plus ecosystem-specific search-option structs in subpackages such as
`packages/container`, `packages/debian`, and `packages/conda`. This is the storage layer behind
Gitea's built-in package registry (npm, Maven, Docker/OCI, Debian, Conda, and a dozen more
ecosystems); the full schema, content-addressable blob de-duplication design, and per-ecosystem
adapters are documented in
[Packages & Registry: Database Schema](../15-packages-registry/database-schema.md).

## `models/git` — Git-Adjacent Metadata Tables

Persistence for git-level concepts that need database-backed indexing/locking beyond what the
git object store itself provides:

| Type | File | Purpose |
|---|---|---|
| `Branch` | `branch.go` | Cached metadata (last commit, pusher, deleted state) for every branch ever seen on a repo, including soft-deleted branches (`IsDeleted`) so the UI can offer "restore branch" |
| `ProtectedBranch` | `protected_branch.go` | Branch protection rules (required reviews, required status checks, push/merge allow-lists) |
| `ProtectedTag` | `protected_tag.go` | Tag protection rules — which users/teams may create tags matching a name pattern |
| `LFSLock` | `lfs_lock.go` | Git LFS file locking (`git lfs lock`), preventing concurrent binary-file edits |
| `LFSMetaObject` | `lfs.go` | Maps an LFS pointer (`oid`, `size`) to the repositories that reference it, for garbage collection and access checks |
| `CommitStatus` | `commit_status.go` | CI/external check results attached to a commit SHA (the data behind commit status icons and required-status-check enforcement) |
| `CommitStatusIndex` / `CommitStatusSummary` | `commit_status_summary.go`, `commit_status.go` | Per-repo-per-commit sequence counter and a denormalized rollup (worst status) used to render the single combined status icon efficiently |
| `RenamedBranch` | `branch.go` | Tracks a branch rename so old URLs/links can redirect to the new name |

`FindRecentlyPushedNewBranchesOptions`/`RecentlyPushedNewBranch` back the "Create Pull Request"
prompt banner shown after a `git push` to a new branch. See
[Git Integration](../10-git-integration/README.md) for how these tables interact with the actual
git object store and hooks.

## Related Pages

- [Repository Model](repository-model.md)
- [Issues & Pull Requests Model](issues-and-pulls-model.md)
- [Permissions Model](permissions-model.md)
- [User & Organization Model](user-organization-model.md)
- [Webhooks & Integrations](../16-webhooks-integrations/README.md)
- [Notifications](../17-notifications/README.md)
- [Actions & CI](../14-actions-ci/README.md)
- [Packages & Registry](../15-packages-registry/README.md)
- [Testing & Fixtures](testing-fixtures.md) — how all of the above models get exercised by unit tests
