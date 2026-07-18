# Issues & Pull Requests

Documentation of Gitea's issue tracker and pull request workflows: the data model, the
service-layer orchestration of issue lifecycle events, the code-review process, and the
branch-protection/merge decision pipeline.

The `Issue`, `PullRequest`, comment, label, and milestone entities — and how they relate to each
other — are documented in full under **05 · Database & Models**, since the domain model is the
most useful starting point for understanding this feature area. The pages in this section build on
that model to explain the *behavior* on top of it: how an issue moves through its lifecycle, how a
pull request gets reviewed, and how Gitea decides whether a pull request is allowed to merge.

## Section Contents

| Page | Description |
|---|---|
| [Issues & Pull Requests Model](../05-database-models/issues-and-pulls-model.md) | `Issue`, `PullRequest`, comments, labels, milestones, and their relationships |
| [Issue Tracking Workflow](issue-tracking-workflow.md) | Issue creation, labels & label templates, milestones, assignees, cross-references, time tracking, and deletion (`services/issue`, `modules/label`, `modules/references`) |
| [Code Review & Comments](code-review-and-comments.md) | Diff rendering for review (`services/gitdiff`), inline/review comments, review submission & dismissal, CODEOWNERS, manual review requests, and the PR review/merge state machine |
| [Branch Protection & Merge](branch-protection-and-merge.md) | `ProtectedBranch` rules, the `CheckPullMergeable`/`CheckPullBranchProtections` gate, force-merge bypass, signed-commit requirements, and scheduled auto-merge (`services/pull`, `services/automerge`, `services/automergequeue`) |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the REST API for issues/PRs | [REST API v1 Overview](../07-rest-api/api-v1-overview.md) |
| See the web routes for issue/PR pages | [Web Router & Server-Rendered UI](../06-web-routers/web-routes.md) |
| See how PR merges/notifications are dispatched | [Notifications, Mailer & Webhooks](../09-core-modules/notify-mailer-webhook.md) |
