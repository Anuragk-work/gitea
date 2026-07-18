# Issue Tracking Workflow

This page walks through the end-to-end life of an `Issue` — creation, labelling, milestones,
assignees, cross-references, and time tracking — as implemented by `services/issue` on top of the
`models/issues` tables described in
[Issues & Pull Requests Model](../05-database-models/issues-and-pulls-model.md). It complements
that model reference by focusing on the *service-layer orchestration*: what happens, in what order,
and which notifications fire, each time an issue changes.

Source: `services/issue/*.go`, `modules/label/*.go`, `modules/references/references.go`,
`models/issues/{issue,issue_label,milestone,tracked_time,stopwatch,issue_xref}.go`.

## Creating an Issue — `NewIssue`

```go
func NewIssue(ctx context.Context, repo *repo_model.Repository, issue *issues_model.Issue,
    labelIDs []int64, uuids []string, assigneeIDs, projectIDs []int64) error
```

(`services/issue/issue.go`)

1. Loads the poster and rejects the call with `user_model.ErrBlockedUser` if the poster is blocked
   by the repo owner or by any of the requested assignees (Gitea's user-blocking feature applies at
   creation time, not just afterwards).
2. Inside a single DB transaction:
   - `issues_model.NewIssue(ctx, repo, issue, labelIDs, uuids)` inserts the `Issue` row (allocating
     its per-repo `Index` via the shared `ResourceIndex` counter — see the model page), attaches the
     given labels, and links the given attachment UUIDs.
   - For each `assigneeID`, loads the user and calls `AddAssigneeIfNotAssigned`, collecting the
     `Comment` each assignment produces (used later for per-assignee notifications).
   - If `projectIDs` is non-empty, `IssueAssignOrRemoveProject` places the issue onto the given
     project board(s)/column(s).
3. Outside the transaction (so notification failures never roll back the issue itself):
   - `FindAndUpdateIssueMentions` scans the issue body for `@user` mentions and records them.
   - `notify_service.NewIssue` fires the "new issue" notification (in-app + webhook + mail).
   - If labels were attached, `notify_service.IssueChangeLabels`.
   - If a milestone was set at creation, `notify_service.IssueChangeMilestone`.
   - One `notify_service.IssueChangeAssignee` call per assignee, carrying that assignee's specific
     comment from step 2.

## Labels — `modules/label` + `services/issue/label.go`

### Label templates

New repositories/organizations can seed their label set from a **template** file
(`modules/label/parser.go`, loaded via `options.Labels`). Two formats are supported:

- **YAML** (`.yaml`/`.yml`) — a `labels:` list of `{name, color, description, exclusive,
  exclusive_order}` objects (`modules/label/label.go` `Label` struct).
- **Legacy line format** — `<color> <name>; <description>` per line, parsed by
  `parseLegacyFormat`.

Every color, in either format, is normalized by `NormalizeColor`: it trims/lowercases the string,
accepts 3- or 6-hex-digit forms with or without a leading `#`, expands the 3-digit shorthand, and
validates against `^#([0-9a-f]{3}|[0-9a-f]{6})$` — an invalid color aborts template loading with
`ErrTemplateLoad`.

### Applying labels to an issue (`services/issue/label.go`)

| Function | Behavior |
|---|---|
| `AddLabel(ctx, issue, doer, label)` | Attaches one label, posts a `CommentTypeLabel` comment, notifies `IssueChangeLabels` with `added=[label]` |
| `AddLabels(ctx, issue, doer, labels)` | Same, batched, for multiple labels at once |
| `RemoveLabel(ctx, issue, doer, label)` | Checks the doer actually has write access to issues/PRs on the repo (`perm.CanWriteIssuesOrPulls`) before deleting — otherwise returns `ErrOrgLabelNotExist`/`ErrRepoLabelNotExist` to avoid leaking whether the label exists to unauthorized callers; notifies with `removed=[label]` |
| `ReplaceLabels(ctx, issue, doer, labels)` | Reads the current label set, replaces it wholesale (`ReplaceIssueLabels`), then notifies with both the old and new sets so the UI/webhook can show exactly what was added vs. removed |

Labels themselves (`models/issues/label.go`) can be **exclusive** ("scoped" labels, e.g.
`priority/high` vs `priority/low`): `Exclusive=true` plus the substring before the `/` groups
labels into mutually-exclusive sets — assigning one automatically removes any other label sharing
that scope on the same issue (enforced in the model layer, `NewIssueLabel`/`ReplaceIssueLabels`).
Labels are either repo-scoped (`RepoID`) or org-scoped (`OrgID`, usable across every repo the org
owns).

## Milestones — `services/issue/milestone.go`

`ChangeMilestoneAssign(ctx, issue, doer, oldMilestoneID)`:

1. Runs `changeMilestoneAssign` in a transaction:
   - If assigning to a new milestone (`issue.MilestoneID > 0`), verifies that milestone actually
     belongs to the issue's repo (`HasMilestoneByRepoID`) — guards against cross-repo milestone IDs
     leaking through the API.
   - Persists the new `milestone_id` column.
   - Recomputes open/closed counters (`UpdateMilestoneCounters`) for **both** the old and the new
     milestone (a move affects two milestones' completeness percentages).
   - Posts a `CommentTypeMilestone` comment recording `OldMilestoneID` → `MilestoneID`.
2. Fires `notify_service.IssueChangeMilestone` outside the transaction.

`Milestone.BeforeUpdate()` (`models/issues/milestone.go`) automatically recalculates
`Completeness = NumClosedIssues*100/NumIssues` immediately before every save, so the "73% complete"
progress bar is always in sync with the issue counters without a separate recompute step.

## Assignees — `services/issue/assignee.go`

- **`ToggleAssignee(ctx, issue, doer, assignee)`** flips one user between assigned/unassigned via
  `issues_model.ToggleIssueAssignee`, which also creates the `CommentTypeAssignees` comment,
  and returns whether the user ended up removed (`removed=true`) so the caller can notify
  correctly.
- **`ToggleAssigneeWithNotify`** wraps the above and additionally fires
  `notify_service.IssueChangeAssignee`.
- **`DeleteNotPassedAssignee(ctx, issue, doer, assignees)`** implements "replace the whole assignee
  list" semantics the GitHub-compatible way: it diffs the desired `assignees` slice against
  `issue.Assignees`, computes which currently-assigned users are *not* in the new list
  (`toBeRemovedAssignees`), and calls `ToggleAssignee` on each of those to remove them — additions
  are handled separately by the caller (typically another `ToggleAssignee` call per new name), so
  every add/remove still goes through the same comment+notify path rather than a bulk SQL update.

## Cross-References — `modules/references` + `models/issues/issue_xref.go`

Gitea auto-links mentions of other issues/PRs/commits found inside issue/PR titles and bodies, and
(for `Closes #123`-style phrases) can automatically close/reopen the referenced issue when the
referencing issue/PR is merged or closed.

`modules/references/references.go` exposes the regex-driven scanners:

| Pattern | Matches | Example |
|---|---|---|
| `issueNumericPattern` | Local numeric reference | `#123`, `!123` (the `!` form is used when linking specifically to a PR in trackers where `#`/`!` are ambiguous) |
| `crossReferenceIssueNumericPattern` | Cross-repo numeric reference | `org/repo#123` |
| `crossReferenceCommitPattern` | Cross-repo commit reference | `org/repo@d8a994ef` |
| `issueAlphanumericPattern` | External tracker style ID | `ABC-1234` (used when the repo's issue tracker is configured to be external/alphanumeric) |
| `mentionPattern` | User/team mention | `@octocat`, `@myorg/myteam` |
| `timeLogPattern` | Inline time-tracking shorthand in a comment | `@2h30m` |

`findActionKeywords` (further down the same file) recognizes the configured **close/reopen
keywords** (e.g. "closes", "fixes", "resolves" / "reopens") immediately preceding a reference and
tags it with an `XRefAction`:

```go
type XRefAction int64
const (
    XRefActionNone     XRefAction = iota // plain mention, no side effect
    XRefActionCloses                     // closes the referenced issue when resolved
    XRefActionReopens                    // reopens the referenced issue when resolved
    XRefActionNeutered                   // reference existed but its close/reopen effect was cancelled
)
```

`Issue.AddCrossReferences(ctx, doer, removeOld)` (`models/issues/issue_xref.go`) is called whenever
an issue/PR's title or body changes (creation, edit, or a new comment): it re-scans the content,
resolves each raw reference to a real `Issue` row, and creates/updates `Comment` rows of type
`CommentTypeIssueRef`/`CommentTypePullRef` with `RefIssueID`, `RefCommentID`, and `RefAction` set on
the *referenced* issue — this is what makes "mentioned in #456" show up on an issue's timeline.
When `removeOld` is set, `findOldCrossReferences` finds previously-recorded references from the
same issue/comment that no longer appear in the updated content and neuters them
(`neuterCrossReferencesIDs`, flips `RefAction` to `XRefActionNeutered`) rather than deleting them,
preserving the timeline history while dropping their close/reopen effect.

## Time Tracking — `models/issues/{tracked_time,stopwatch}.go`

Two related tables back the "start/stop timer, or add time manually" feature:

- **`Stopwatch`** — at most one active row per `(IssueID, UserID)`, representing a running timer
  started via the `CommentTypeStartTracking` action. Stopping it (`CommentTypeStopTracking`)
  computes the elapsed duration and inserts a `TrackedTime` row for it.
- **`TrackedTime`** (`models/issues/tracked_time.go`) — one row per logged time entry:
  `{IssueID, UserID, Time (seconds), Deleted}`. `LoadAttributes` lazily loads the `Issue` (and its
  `Repo`) and the `User` (falling back to a ghost user if the original user was deleted).
  `Issue.LoadTotalTimes(ctx)` sums non-deleted `TrackedTime.Time` for the issue to show the total
  logged time on the issue page.

Manual entries (as opposed to timer-derived ones) go through `CommentTypeAddTimeManual`, and
deleting a logged entry produces `CommentTypeDeleteTimeManual` — both recorded as issue-timeline
comments so the history of who logged what time is auditable. The `@2h30m` inline shorthand
recognized by `timeLogPattern` above lets a commenter log time directly from a comment body instead
of using the timer UI.

## Closing / Reopening

Closing or reopening an issue (`issues_model.SetIssueAsClosed`, invoked directly by users, or
indirectly by a merge via `SetMerged`, or by a resolved `Closes #N` cross-reference) flips
`IsClosed` and `ClosedUnix`, decrements/increments the repo's open/closed issue counters and the
containing milestone's counters, and records a `CommentTypeClose`/`CommentTypeReopen` comment.
`Issue.IsOverdue()` compares `DeadlineUnix` against `ClosedUnix` (if closed) or the current time —
an issue closed before its deadline is never considered overdue, even later, since the comparison
uses the closing timestamp rather than "now."

## Deleting an Issue — `DeleteIssue`

`DeleteIssue(ctx, doer, issue)` (`services/issue/issue.go`) is the exhaustive teardown path:

1. Loads full attributes and the `PullRequest` extension (if any).
2. `deleteIssue` removes the `Issue` row and, in the same transaction, every satellite row that
   references it: `ContentHistory`, `Comment` (both `IssueID=` and, separately,
   `RefIssueID=`/`DependentIssueID=` — i.e. comments *about* this issue on other issues too),
   `IssueLabel`, `IssueDependency` (both directions), `IssueAssignees`, `IssueUser`,
   `activities_model.Notification`, `Reaction`, `IssueWatch`, `Stopwatch`, `TrackedTime`,
   `ProjectIssue`, `Attachment`, `PullRequest`, and `IssuePin` — then decrements the repo's
   issue/PR counters and the milestone's counters.
3. If the issue was a pull request, its `refs/pull/<n>/head` ref is removed from the base repo
   (`gitrepo.RemoveRef`) so the git side is cleaned up too.
4. Attachment files are removed from storage only *after* the transaction commits
   (`system_model.RemoveStorageWithNotice`), so a failed transaction never orphans deletes files
   that are still referenced by rows that got rolled back.
5. `notify_service.DeleteIssue` fires last.

`DeleteIssuesByRepoID` and `DeleteOrphanedIssues` reuse the same `deleteIssue` primitive to clean up
every issue in a deleted repository, or issues whose owning repository row is already gone,
respectively — both process issues page-by-page (`db.DefaultMaxInSize` at a time) to bound memory
use on large repositories.

## Related Pages

- [Issues & Pull Requests Model](../05-database-models/issues-and-pulls-model.md)
- [Code Review & Comments](code-review-and-comments.md)
- [Branch Protection & Merge](branch-protection-and-merge.md)
