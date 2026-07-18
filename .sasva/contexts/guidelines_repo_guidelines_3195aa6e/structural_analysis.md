# Structural Analysis: Gitea (go-gitea/gitea)

## 1. Tech Stack

**Backend (dominant):** Go, 2982 files. Module namespace is `gitea.dev` (per go.mod, aliased in gci as a custom import section) — imported in 2500/2982 files as `gitea.dev/modules`, plus `gitea.dev/models` (917), `gitea.dev/services` (284), `gitea.dev/routers` (145). This confirms a layered internal-package architecture, not a flat app.

**ORM/DB:** `xorm.io/xorm` (97 files) + `xorm.io/builder` (145 files) — Gitea's persistence layer is XORM-based, query-builder heavy.

**Testing:** `github.com/stretchr/testify` (589 files) + native `testing` (523) — testify is the de facto assertion/mocking standard, enforced further by the `testifylint` linter (with `empty`, `go-require`, `require-error` checks disabled).

**Auth infra:** `ldap-test` appears in 65 files, indicating LDAP is a first-class, heavily tested auth backend (also visible in `cmd/admin_auth_ldap*.go`).

**Markdown:** `github.com/yuin/goldmark` (66 files) — the markdown rendering engine.

**Frontend:** TypeScript (250 files) with Vue (`vue`, `@vitejs/plugin-vue`), Vite as bundler, TailwindCSS for styling, Stylelint for CSS linting. Build tooling: `vite-string-plugin` (custom), `vite.config`, `stylelint.config.ts`.

**Standard library heavy:** `strings` (542), `fmt` (522), `context` (486), `time` (288), `net/http` (252), `errors` (244), `io` (234), `os` (156), `strconv` (152), `bytes` (131), `path/filepath` (115), `net/url` (111), `sync` (106), `regexp` (80), `slices` (72) — idiomatic stdlib-first Go, reinforced by the `usestdlibvars` linter.

**Banned/replaced libraries (from `.golangci.yml` depguard):**
- `encoding/json` → must use `gitea.dev/modules/json` instead
- `github.com/unknwon/com` → use gitea's `util`
- `io/ioutil` → use `os`/`io`
- `golang.org/x/exp` → banned as experimental
- `gopkg.in/ini.v1` → use gitea's config system
- `gitea.com/go-chi/cache` → use gitea's cache system
- `github.com/pkg/errors` → use builtin `errors`

## 2. Project Layout

**Layered monolith with domain-oriented subpackages**, not classic MVC/DDD naming but functionally similar:
- `models/` — persistence layer, split by domain: `actions/`, `activities/`, `admin/`, `asymkey/`, `auth/`, `avatars/`, `db/`, `dbfs/`, `git/`, `gituser/`, `issues/`, each with focused single-responsibility files (e.g., `gpg_key.go`, `gpg_key_add.go`, `gpg_key_commit_verification.go` — fine-grained decomposition rather than one giant file per entity).
- `models/migrations/` — versioned by release: `v1_10/`, `v1_11/`, `v1_12/`... each containing individually numbered migration files (`v88.go`, `v89.go`...), isolated from the main `models` package via a `depguard` rule (`migrations must not depend on the models package` and `must not depend on modules/structs`).
- `models/fixtures/` — YAML fixtures per entity (`access.yml`, `action.yml`, etc.) for integration test data — indicates fixture-based DB testing convention.
- `cmd/` — CLI subcommands, flat file-per-command structure (`admin_auth_ldap.go`, `admin_user_create.go`), each paired with a `_test.go` sibling.
- `contrib/` — deployment/init scripts for many platforms (systemd, sysvinit, openrc/gentoo, freebsd, sunos, launchd) — broad OS support is a structural concern.
- `docker/` — multi-stage, rootless + rootful image variants.
- `docs/` — topic-split contribution docs (`guidelines-backend.md`, `guidelines-frontend.md`, `guidelines-refactoring.md`, `testing.md`) rather than one CONTRIBUTING monolith — CONTRIBUTING.md is an index/router into these.
- Naming convention: `_list.go` suffix for collection/list operations (`run_attempt_list.go`, `comment_list.go`, `notification_list.go`), `_test.go` colocated with source, `main_test.go` per package for shared test setup.

**Not a monorepo in the JS sense** — single Go module + single `package.json`, frontend and backend coexist in one repo but backend dominates (2982 vs 250 files).

## 3. Explicit Rules (Enforced Automatically)

**Formatting (`.editorconfig`):**
- Default: 2-space indent, LF, UTF-8, trim trailing whitespace, final newline required.
- `.go`, `.tmpl`, `.html`: tab indentation.
- Special overrides for specific template dirs (e.g., `templates/custom/*.tmpl` disables final newline; `templates/shared/actions/runner_badge_*.tmpl` unsets charset for XML-like files).
- `.svg`: no final newline.

**Go linting (`.golangci.yml`, golangci-lint v2 config):**
- `linters.default: none` — explicit opt-in list only: bidichk, bodyclose, depguard, dupl, errcheck, forbidigo, gocheckcompilerdirectives, gocritic, govet, ineffassign, mirror, modernize, nakedret, nilnil, nolintlint, perfsprint, revive, staticcheck, testifylint, unconvert, unparam, unused, usestdlibvars, usetesting, wastedassign.
- `revive.severity: error` with a curated rule set (blank-imports, context-as-argument, exported, error-strings, var-naming with underscore exception for migration packages, package-comments, etc.).
- `staticcheck`: all checks enabled except ST1003, ST1005, QF1001, QF1006, QF1008.
- `nolintlint`: unused `//nolint` disallowed, explanations required, must be specific.
- Path-based exclusions: `dupl`/`errcheck`/`staticcheck`/`unparam` skipped in `_test.go`; `dupl`/`errcheck` skipped in `models/migrations/v*`; `forbidigo` skipped in `cmd/`; `dupl` skipped for webhook-related matches.
- Excluded paths: `node_modules`, `.venv`, `public`, `web_src`, `third_party`, `builtin`, `examples`.
- Formatters enforced: `gci` (custom import order: standard → `gitea.dev` prefix → blank → default) and `gofumpt` (with `extra-rules`) — this is why `gitea.dev/modules` imports are so uniformly grouped.

**Commit/PR conventions (`AGENTS.md`, `CONTRIBUTING.md`):**
- Conventional Commits required (`type(scope): subject`, `!` for breaking).
- Fixed type vocabulary: build, ci, chore, docs, feat, enhance, fix, perf, refactor, revert, style, test.
- No force-push/amend/squash on open PRs — new commits only.
- `Assisted-by: AGENT_NAME:MODEL_VERSION` trailer required for AI-assisted commits; `Co-Authored-By`/`Signed-off-by` explicitly forbidden for AI (human-only sign-off).
- Copyright header mandate: `// Copyright <year> The Gitea Authors. All rights reserved.` + `// SPDX-License-Identifier: MIT`.
- TypeScript rule: prefer `!` non-null assertion over `?.`/`??` when value is guaranteed.
- CSS rule: prefer `flex-*` utilities over per-child margin utilities; `tw-*` only when `!important` specificity is needed.

## 4. Build & CI

- **Primary build orchestrator:** `Makefile` (root) plus a separate `contrib/grafana-monitoring-mixin/Makefile` for observability tooling — `make help`, `make fmt`, `make lint-go`, `make lint-js`, `make tidy`, `make frontend` targets referenced explicitly in `AGENTS.md`/`Dockerfile`.
- **Docker:** Multi-stage `Dockerfile` — frontend built first on native `$BUILDPLATFORM` (Node/pnpm) inside `golang:1.26-alpine3.24`, avoiding QEMU cross-build issues for the JS ecosystem; backend built per target platform in a second stage with `CGO_EXTRA_CFLAGS`, `TAGS="bindata timetzdata $TAGS"`, `go mod download` cached separately from source copy. Separate `rootless` variant tracked via `docker/manifest.rootless.tmpl`.
- **Test tiers** (per `docs/testing.md` reference and file layout): unit tests (`_test.go`, `main_test.go` per package), integration tests using YAML `fixtures/`, e2e via Playwright (`GITEA_TEST_E2E_FLAGS='<filepath>' make test-e2e`), migration tests (`models/migrations/migrationtest/tests.go`).
- **JS testing:** Vitest (`pnpm exec vitest <path-filter>` per AGENTS.md).
- Target sub-2s runtime goal for integration/e2e tests per AGENTS.md — implies aggressive test parallelization/scoping expectation.

## 5. Dependency Management

- **Go:** `go.mod`/`go.sum`, Go 1.26 toolchain (per Dockerfile base image `golang:1.26-alpine3.24`), module path `gitea.dev`. `make tidy` mandated after `go.mod` changes.
- **JS:** `pnpm` with `pnpm-lock.yaml` and `pnpm-workspace.yaml` (frozen-lockfile install in Docker: `pnpm install --frozen-lockfile`).
- **Python tooling present but secondary:** `pyproject.toml` + `uv.lock` (uv-managed, likely for docs/build scripts, not core app).
- **License compliance tracked:** `assets/go-licenses.json` — indicates automated Go dependency license auditing.
- Strict dependency substitution policy enforced via `depguard` (see banned packages above) rather than just documentation — dependency choices are compiler-enforced, not just conventional.

## 6. Core Libraries & Internal Packages (MUST-USE)

**Internal/project-namespaced (highest priority, must-use for new code):**
- `gitea.dev/modules` (2500 files) — the dominant internal utility/shared-logic layer; virtually every file touches it.
- `gitea.dev/models` (917 files) — canonical data-access layer; migrations are explicitly forbidden from importing it (depguard rule), signaling strict layering (migrations must be self-contained/decoupled from live model definitions).
- `gitea.dev/services` (284 files) — business-logic/service layer sitting above models.
- `gitea.dev/routers` (145 files) — HTTP routing/handler layer.
- `gitea.dev/modules/json` — mandated replacement for `encoding/json` (enforced by depguard, not optional).
- `gitea.dev/modules/git/internal` — explicitly banned direct use; must go through `AddXxx` function wrappers instead, showing an internal facade pattern even within the module.

**External but pervasive/must-use by convention:**
- `github.com/stretchr/testify` (589 files) — de facto standard assertion library, enforced via `testifylint`.
- `xorm.io/xorm` + `xorm.io/builder` — the only sanctioned ORM/query layer; no competing DB library evident.
- `github.com/yuin/goldmark` — sole markdown renderer (66 files), used for issue/PR bodies, wiki, comments.
- LDAP test harness (`ldap-test`, 65 files) treats LDAP as a core, deeply tested integration, not a peripheral feature.

**Explicitly forbidden substitutes (do not introduce):** `encoding/json`, `io/ioutil`, `github.com/unknwon/com`, `golang.org/x/exp`, `gopkg.in/ini.v1`, `gitea.com/go-chi/cache`, `github.com/pkg/errors` — any new code using these will fail lint via `depguard`.