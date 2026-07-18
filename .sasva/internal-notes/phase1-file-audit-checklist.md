# Phase 1 — Internal File Audit Checklist (NOT PUBLISHED)

> Internal working note for later phases. Not part of the published `docs/` wiki and must
> not be linked from `docs/index.md` or any section `README.md`.

Generated: 2026-07-17, via `find docs -type d` and `find docs -name "README.md"`.

## 1. Directory structure — confirmed present (24 section dirs + build-cicd-deployment)

All 22 numbered sections (`01-introduction` … `22-contributing-development`) plus
`build-cicd-deployment/` exist on disk. Every section has a `README.md`. ✅ 24/24 confirmed.

## 2. Root supplementary pages — confirmed present (9/9)

- `docs/build-setup.md` — EXISTS
- `docs/build-source.md` — EXISTS
- `docs/community-governance.md` — EXISTS
- `docs/development.md` — EXISTS
- `docs/guidelines-backend.md` — EXISTS
- `docs/guidelines-frontend.md` — EXISTS
- `docs/guidelines-refactoring.md` — EXISTS
- `docs/release-management.md` — EXISTS
- `docs/testing.md` — EXISTS
- `docs/index.md` — EXISTS (left untouched this phase; final reconciliation in Phase 25)

## 3. Existing substantive files — "refresh" in later phases (DO NOT recreate, only edit)

| Section | Existing files |
|---|---|
| 01-introduction | README.md |
| 02-architecture | README.md, system-architecture.md, request-lifecycle.md, module-dependency-map.md, deployment-topologies.md |
| 03-getting-started | README.md, overview.md, installation-and-build.md, configuration-app-ini.md, running-gitea.md |
| 04-configuration | README.md, settings-catalog.md |
| 05-database-models | README.md, db-engine-and-drivers.md, migrations.md, repository-model.md, permissions-model.md, issues-and-pulls-model.md, user-organization-model.md |
| 06-web-routers | README.md, web-routes.md |
| 07-rest-api | README.md, api-v1-overview.md, api-conventions-and-swagger.md |
| 08-services | README.md, auth-providers.md, services-catalog.md |
| 09-core-modules | README.md, git-module.md, indexers.md, lfs-and-hooks.md, markup-engines.md, notify-mailer-webhook.md, storage-queue-cache.md, frontend-build.md, frontend-features.md |
| 11-authentication | README.md (sub-pages `auth-sources.md`, `authorization-model.md`, `tokens-and-oauth-apps.md`, `two-factor-and-recovery.md` referenced by plan but NOT found on disk — flag for the owning phase to create, not "refresh") |
| 12-repository-management | README.md (sub-pages `repository-lifecycle.md`, `releases-wiki-projects.md` referenced by plan but NOT found on disk — flag for owning phase) |
| 13-issues-pullrequests | README.md (existing); `branch-protection-and-merge.md` referenced by plan but NOT found on disk — flag for owning phase; new stubs `issue-tracking-workflow.md`, `code-review-and-comments.md` created this phase |
| 14-actions-ci | README.md, actions-architecture.md |
| 15-packages-registry | README.md, database-schema.md, package-flow.md, protocol-adapters.md (NOT found — flag), shared-infrastructure.md, supported-ecosystems.md |
| 16-cli-admin | README.md, cli-commands.md (service-management.md referenced by plan but NOT found on disk — flag) |
| 20-frontend-ui | README.md, go-templates.md (feature-modules.md, markup-processing.md, progressive-enhancement.md, svg-icon-system.md, vue-components.md, build-pipeline.md referenced by plan but NOT found on disk — flag for owning phase); new stub `web_src-directory-map.md` created this phase |
| 21-testing-quality | README.md, unit-integration-e2e-fuzz.md |
| 22-contributing-development | README.md, contribution-workflow.md (ai-assisted-contributions.md, backend-coding-conventions.md, frontend-coding-conventions.md, governance-and-security.md, issue-pr-templates-and-automation.md referenced by plan but NOT found on disk — flag for owning phase) |
| build-cicd-deployment | README.md, docker-and-packaging.md, github-workflows.md, makefile-and-build.md |

**Note for downstream phases:** Several sections listed as "[EXISTS — verify/refresh]" in the
plan actually have FEWER sub-pages on disk than the plan's Documentation Structure tree
implies (e.g., `11-authentication`, `12-repository-management`, `15-packages-registry`'s
`protocol-adapters.md`, `16-cli-admin`'s `service-management.md`, most of `20-frontend-ui`,
most of `22-contributing-development`). Their owning phases should treat those specific
missing sub-pages as **new creation**, not refresh, even though the section overall is
marked `[EXISTS]` in the plan. This phase intentionally did not stub these out because they
are outside this phase's explicit stub list (only the five thin sections + six extend-target
files were in scope for Phase 1).

## 4. New stub files created this phase (18 total, title + one-line description only)

### 10-git-integration/ (thin section — build out)
- [x] git-backends-and-catfile.md
- [x] git-operations-and-hooks.md
- [x] gitrepo-and-repository-access.md

### 16-webhooks-integrations/ (thin section — build out)
- [x] webhook-delivery-pipeline.md
- [x] webhook-event-types-and-payloads.md
- [x] third-party-integrations.md

### 17-notifications/ (thin section — build out)
- [x] notification-delivery-and-uinotification.md
- [x] email-notification-templates.md

### 18-admin-guide/ (thin section — build out)
- [x] admin-panel-and-operations.md
- [x] backup-restore-and-doctor.md
- [x] monitoring-and-observability.md

### 19-cli-commands/ (thin section — build out)
- [x] cli-command-reference-index.md

### Extend-target files (existing sections gaining new catalog/deep-dive pages)
- [x] 07-rest-api/packages-and-actions-api.md
- [x] 08-services/services-catalog-full.md
- [x] 09-core-modules/modules-catalog-full.md
- [x] 13-issues-pullrequests/issue-tracking-workflow.md
- [x] 13-issues-pullrequests/code-review-and-comments.md
- [x] 20-frontend-ui/web_src-directory-map.md

All 18 confirmed via `find docs -name "*.md" | sort` after creation — no duplicates, no
naming drift from the plan's Documentation Structure tree.

## 5. Untouched this phase

- `docs/index.md` — left as-is per plan instruction; full nav/index reconciliation deferred
  to Phase 25 (Wiki Index & Navigation).
- The five thin sections' `README.md` files were **read only** (not edited) this phase; their
  "refresh" (updating Section Contents tables to link the new sub-pages) is scheduled for
  their respective build-out phases (10, 16, 17, 18, 19 in the plan), not Phase 1.
