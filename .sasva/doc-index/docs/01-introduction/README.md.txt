=== FILE: docs/01-introduction/README.md ===
=== METADATA: format=md ===
[SUMMARY] # Introduction An overview of what Gitea is, its history, feature domains, licensing, and project governance. ## What Gitea Is Gitea is a self-hosted, lightweight software forge that provides Git hosting, a REST/Swagger API, an issue tracker, pull requests with code review, project boards (kanban), a wiki, organizations/teams, a multi-ecosystem package registry, and a CI/CD system (**Gitea Actions**,

# Introduction

An overview of what Gitea is, its history, feature domains, licensing, and project governance.

## What Gitea Is

Gitea is a self-hosted, lightweight software forge that provides Git hosting, a REST/Swagger
API, an issue tracker, pull requests with code review, project boards (kanban), a wiki,
organizations/teams, a multi-ecosystem package registry, and a CI/CD system (**Gitea Actions**,
which reuses GitHub Actions workflow syntax) — all shipped as a single static Go binary
(module `gitea.dev`, built with **Go 1.26.4** per `go.mod`). Because it is written in Go, it runs
on **all** platforms and architectures that Go supports, including Linux, macOS,
FreeBSD/OpenBSD, and Windows, on x86, amd64, ARM, RISC-V 64, and PowerPC.

Gitea began in 2016 as a fork of [Gogs](https://gogs.io) — the copyright header in
[`LICENSE`](../../LICENSE) still credits both "The Gitea Authors" (2016) and "The Gogs Authors"
(2015) — and has since grown into an independent, community-governed project. Governance,
maintainer expectations, and the pull-request review workflow are documented in
[Community Governance](../community-governance.md) and summarized in
[Contribution Workflow](../22-contributing-development/contribution-workflow.md); the current
list of maintainers is tracked in the root [`MAINTAINERS`](../../MAINTAINERS) file and on the
[GitHub organization people page](https://github.com/orgs/go-gitea/people).

The backend follows a `cmd → routers → services → models → modules` layering (see
[Architecture](../02-architecture/README.md)), and the web frontend is a hybrid of
server-rendered Go `html/template` views progressively enhanced with TypeScript, Vue 3, and
Vite-bundled assets under `web_src/`, styled with Tailwind CSS and Fomantic UI.

Gitea can run against SQLite, MySQL, PostgreSQL, or MSSQL, can be deployed as a single binary,
inside Docker/Podman (official image at
[hub.docker.com/r/gitea/gitea](https://hub.docker.com/r/gitea/gitea)), via Gitea Cloud
(free trial at [cloud.gitea.com](https://cloud.gitea.com)), or explored via the public demo at
[demo.gitea.com](https://demo.gitea.com) and the free hosted service at
[gitea.com](https://gitea.com/user/login).

## Feature Domains

Gitea's feature set spans Git hosting/collaboration, project management, automation, and
extensibility. The map below groups the domains covered by this documentation set and links each
to the section where it is documented in depth.

```mermaid
mindmap
  root((Gitea))
    Git Hosting
      Repositories & branches
      Git backends & cat-file pool
      SSH + HTTP(S) Git transport
      Git LFS
    Code Review
      Pull requests
      Code review & diffs
      Merge queue / auto-merge
    Issue Tracking
      Issues & labels
      Milestones
      Project boards (kanban)
    Wiki
      Git-backed wiki pages
    Actions / CI-CD
      GitHub-Actions-compatible workflows
      Runners & act_runner
      Artifacts & logs
    Package Registry
      npm, Maven, NuGet, Docker/OCI, and more
    Webhooks & Integrations
      Outbound webhooks
      Third-party integrations
      Notifications (web/email)
    Organizations & Auth
      Teams & permissions
      OAuth2 / LDAP / SSPI / PAM
      2FA, WebAuthn/Passkeys
    Administration
      Admin panel & CLI
      Backup, restore, doctor
```

| Feature Domain | Documented In |
|---|---|
| Git hosting, backends, and repository access | [Git Integration](../10-git-integration/README.md) |
| Repository management (branches, releases, wiki) | [Repository Management](../12-repository-management/README.md) |
| Issues, pull requests, and code review | [Issues & Pull Requests](../13-issues-pullrequests/README.md) |
| Actions / CI-CD | [Actions & CI](../14-actions-ci/README.md) |
| Package registry | [Packages & Registry](../15-packages-registry/README.md) |
| Webhooks & third-party integrations | [Webhooks & Integrations](../16-webhooks-integrations/README.md) |
| Notifications (web & email) | [Notifications](../17-notifications/README.md) |
| Administration, backup/restore, doctor | [Admin Guide](../18-admin-guide/README.md) |
| Authentication (OAuth2, LDAP, 2FA, WebAuthn) | [Authentication](../11-authentication/README.md) |
| REST/Swagger API | [REST API](../07-rest-api/README.md) |

## Licensing and Security

Gitea is licensed under the **MIT License** — see the root [`LICENSE`](../../LICENSE) file for
the full text. There is no copyleft or attribution requirement beyond preserving the license and
copyright notice; the project may be self-hosted, modified, and redistributed (including
commercially) under those terms.

Vulnerability reporting follows the process in the root [`SECURITY.md`](../../SECURITY.md):
security issues should be reported privately to `security@gitea.io` (optionally encrypted with
the published PGP key) rather than filed as public issues, and previously-disclosed
vulnerabilities are listed at [about.gitea.com/security](https://about.gitea.com/security). For
an in-depth analysis of Gitea's overall security posture — including where controls already
exist in CI, where documented gaps remain, and how the codebase's layered architecture is
enforced by tooling rather than convention — see
[Security Posture Overview](../../derived-docs/01-overview/security-posture-overview.md) in the
security-focused documentation set. This Introduction section does not duplicate that analysis;
it links to it as the canonical source.

## Section Contents

| Page | Description |
|---|---|
| [Introduction](README.md) | This page — what Gitea is, its feature domains, licensing, and goals |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| Install and run Gitea | [Getting Started](../03-getting-started/README.md) |
| Understand the system design | [Architecture](../02-architecture/README.md) |
| Understand governance and the maintainer/review process | [Community Governance](../community-governance.md) |
| Review the security posture and disclosure process | [Security Posture Overview](../../derived-docs/01-overview/security-posture-overview.md) |
| See the full section index | [Home](../index.md) |
