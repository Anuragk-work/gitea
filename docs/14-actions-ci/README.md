# Actions & CI

An overview of Gitea Actions, its runner architecture, and CI/CD workflows.

Gitea Actions is Gitea's built-in CI/CD system, compatible with a large subset
of GitHub Actions workflow syntax. Workflow YAML files in `.gitea/workflows/`
(or `.gitea/scoped_workflows/` for org-wide shared workflows) are picked up by
the Gitea server, turned into jobs, and dispatched over Connect-RPC to one or
more external `act_runner` processes that actually execute the steps (each in
its own container or shell). The Gitea server itself never runs workflow
steps — it only detects, schedules, tracks, and reports on runs.

## Section Contents

| Page | Description |
|---|---|
| [Actions Architecture](actions-architecture.md) | Workflow-file detection (`.gitea/workflows`, `.gitea/scoped_workflows`) and YAML parsing; the `models/actions` data model; the runner registration/task-dispatch Connect-RPC protocol (`Register`, `Declare`, `FetchTask`, `UpdateTask`, `UpdateLog`); artifact upload/download (legacy chunked API and the GitHub Actions Results API v4); commit status reporting; secrets & variables scoping (org/user/repo, fork-PR restrictions, reusable-workflow `secrets:` policy, and the `services/secrets` write path shared by the org/user/repo API and web UI); and a Mermaid sequence diagram of the end-to-end flow from `git push` through task pickup by a runner |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the CI pipeline used to build/test Gitea itself | [GitHub Workflows & Actions](../build-cicd-deployment/github-workflows.md) |
| See how Actions notifications/webhooks are dispatched | [Notifications, Mailer & Webhooks](../09-core-modules/notify-mailer-webhook.md) |
| See CLI commands for managing runners | [CLI & Admin Operations](../16-cli-admin/cli-commands.md) |
