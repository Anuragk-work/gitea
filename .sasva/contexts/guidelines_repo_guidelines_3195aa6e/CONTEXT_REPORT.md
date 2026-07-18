# Repo Guidelines

## Tech Stack & Frameworks

> Note on verification coverage: the most recent verification pass sampled mostly frontend-tooling configs (stylelint, tailwind, eslint-json, playwright, vitest, `types.d.ts`) plus two Go files (`main.go`, `main_timezones.go`). Backend-specific claims below (ORM, migrations, LDAP, markdown engine, models/services layering) are carried forward from prior structural analysis and remain **unverified-but-uncontradicted** in this pass — treat with correspondingly lower confidence until re-checked against `models/`/`services/`/`routers/`/`migrations/` files.

- **Language:** Go 1.26 (toolchain pinned via `golang:1.26-alpine3.24` in Dockerfile), module namespace `gitea.dev`. [Import grouping/license-header conventions confirmed directly via `main.go`/`main_timezones.go`.]
- **CLI framework:** `github.com/urfave/cli/v3` — the sanctioned framework for all `cmd/` subcommand registration (previously unlisted; confirmed via `main.go`). Entry point uses a `cli.OsExiter` override paired with an explicit log-flush call (see Common Patterns → CLI Entrypoint Pattern).
- **ORM/DB:** `xorm.io/xorm` (97 files) + `xorm.io/builder` (145 files) — sole sanctioned persistence layer. No raw `database/sql` usage expected in application code. [UNVERIFIED in latest sample — no models/migrations files present.]
- **Frontend:** TypeScript (250 files) + Vue 3, bundled with Vite, styled with TailwindCSS, linted with Stylelint + ESLint (flat config, multiple plugins: `eslint-plugin-vue`, `eslint-plugin-unicorn`, `eslint-plugin-sonarjs`, `@typescript-eslint`). There is also a **dedicated JSON linting pass**: `eslint.json.config.ts` uses `@eslint/json` to lint `.json`/`.json5`/`.jsonc` files, with per-path language variants (e.g. `allowTrailingCommas` enabled for `.vscode`/`tsconfig.json`).
- **Markdown rendering:** `github.com/yuin/goldmark` (66 files) — the only markdown engine; do not add a competing renderer. [UNVERIFIED in latest sample.]
- **Auth:** LDAP is a first-class backend (`ldap-test` in 65 files, `cmd/admin_auth_ldap*.go`) — treat as core, not optional. [UNVERIFIED in latest sample.]
- **Package managers:** Go modules (`go.mod`/`go.sum`), `pnpm` for JS (`pnpm-lock.yaml`, frozen-lockfile installs), `uv`/`pyproject.toml` for secondary Python tooling (docs/build scripts only — not core app code).

## Project Structure

> Note: no `models/`, `services/`, `routers/`, or `models/migrations/` files were present in the latest verification sample — the items below remain as previously established and were not re-confirmed or contradicted this pass.

- **Layered monolith**, not MVC: `models/` (persistence) → `services/` (business logic, 284 files) → `routers/` (HTTP handlers, 145 files) → `modules/` (shared utilities, 2500 files — imported almost everywhere).
- New DB-backed entities go in `models/<domain>/` (e.g. `models/issues/`, `models/actions/`), split into fine-grained single-responsibility files rather than one big file per entity (see `gpg_key.go`, `gpg_key_add.go`, `gpg_key_commit_verification.go`).
- Collection/list operations get a dedicated `_list.go` file (`comment_list.go`, `run_job_list.go`, `notification_list.go`) — do not bolt list methods onto the entity's main file.
- **Migrations live in `models/migrations/v1_XX/`**, one numbered file per DB version (`v100.go`, `v276.go`...). [ENFORCED] `depguard` forbids migrations from importing `models` or `modules/structs` — migration files must redefine any structs they need locally (see Anti-patterns/Common Patterns below). Register new migrations in the central `models/migrations.go` via `newMigration(id, desc, fn)`.
- CLI subcommands: flat files in `cmd/`, one command per file, each paired with a `_test.go` sibling (e.g. `admin_auth_ldap.go` + `admin_auth_ldap_test.go`). Built on `github.com/urfave/cli/v3`.
- Fixture-based integration tests use YAML files in `models/fixtures/<entity>.yml`.
- Contribution docs are topic-split in `docs/` (`guidelines-backend.md`, `guidelines-frontend.md`, `guidelines-refactoring.md`, `testing.md`) — check these before inventing new conventions.
- Frontend source lives under `web_src/` (excluded from Go **linting** — ESLint/TS rules do not apply to `.go` files, and `golangci-lint` does not run on `web_src/`). **Clarification:** this does *not* mean Go and frontend tooling are fully isolated — Tailwind's content scanner explicitly parses Go template/source files for class extraction (`tailwind.config.ts` content glob includes `'./{build,models,modules,routers,services}/**/*.go'`). Treat this as a build-tool content-scan concern, distinct from linting — don't mix Go and TS *build artifacts*, but expect Tailwind to read class names out of `.go` files.

## Coding Style & Naming

- **Files:** `snake_case.go` (`protected_branch.go`, `run_job.go`). Migration files: strictly `v<version>.go`. Platform-specific files use Go build tags (`//go:build windows`) combined with a descriptive suffix rather than a strict `_windows.go`-only convention — e.g. `main_timezones.go` guards a `_ "time/tzdata"` side-effect import with an explanatory comment.
- **Structs/Types:** `PascalCase`, named after the singular DB table/entity (`ActionRunJob`, `ProtectedBranch`, `OAuth2Application`).
- **Migration-local struct snapshots:** when a migration needs a model's shape, redefine it locally — never import the live model. Prefix with `migration` where collision risk exists:
  ```go
  // Copy paste from models/repo.go because we cannot import models package.
  type Repository struct { ... }
  ```
- **Error types:** `Err<Noun>` struct + matching `IsErr<Noun>(err) bool` helper:
  ```go
  func IsErrTaskDoesNotExist(err error) bool { _, ok := err.(ErrTaskDoesNotExist); return ok }
  ```
- **Methods:**
  - Lazy relation loaders: `Load*` (`LoadRepo`, `LoadDoer`, `LoadAttributes`).
  - Boolean predicates: `Is*`, `Has*`, `CanUser*` (`CanUserPush`, `HasContentSupport`).
  - Migration entrypoints: PascalCase, verb-first, descriptive (`AddBranchProtectionCanPushAndEnableWhitelist`, `FixMergeBase`).
  - Unexported helpers: camelCase verbs (`getRemoteAddress`, `migratePullMirrors`).
- **Constants:** `iota` enum blocks with trailing `// N` comments; PascalCase even when unexported/local (`PlainGitService`, `TaskTypeMigrateRepo`).
- **Transient/computed fields:** lowerCamelCase, tagged `xorm:"-"` (e.g. `globRule`, `isPlainName`).
- **Import aliasing:** domain-suffixed `_model`/`_module` aliases are mandatory when importing cross-domain model/module packages:
  ```go
  repo_model "gitea.dev/models/repo"
  user_model "gitea.dev/models/user"
  webhook_module "gitea.dev/modules/webhook"
  ```
- **License header** — mandatory on every Go file:
  ```go
  // Copyright <year> The Gitea Authors. All rights reserved.
  // SPDX-License-Identifier: MIT
  ```
  Note: older/inherited files may carry **multiple** copyright lines (e.g. `main.go` has both an original Gogs 2014 attribution and a Gitea 2016 line) before the SPDX line — treat the single-line example as illustrative of the required SPDX/last-line format, not a claim that only one copyright line is permitted.
- **Test naming:** inconsistent today (`TestAddLdapBindDn` vs `Test_SSHParsePublicKey`) — [CONVENTION, not enforced] prefer `Test_<ExactFunctionOrFeatureName>` for new tests to match the majority migration-test style, but don't rewrite existing tests just to reconcile this.
- **TypeScript:** prefer `!` non-null assertion over `?.`/`??` **only when the value is genuinely guaranteed non-null** [CONVENTION, per AGENTS.md]. This rule has a narrow scope: `playwright.config.ts` uses `env.GITEA_TEST_E2E_URL?.replace?.(/\/$/, '')` — that's correct use of `?.`, because an env var is not guaranteed to be set; it is *not* a counter-example to the `!`-preference rule, but illustrates that the rule only applies to genuinely-non-null values (e.g. framework-guaranteed objects), not optional/env-derived data. Don't over-apply `!` to values that can legitimately be `undefined`/`null`. camelCase for vars/functions, PascalCase for imported types (`InlineConfig`, `Plugin`).
- **TypeScript ambient module declarations:** use `declare module` blocks (see `types.d.ts`) both for non-code asset imports (`*.svg`, `*.css`, `*.vue`) and for typing third-party packages that ship no types (e.g. `idiomorph`, `swagger-ui-dist`, `@citation-js/*`). This is the standard way to introduce a typed import surface for an untyped dependency — don't reach for `@ts-ignore`/`any` casts as a first resort.
- **CSS:** prefer `flex-*` utilities over per-child margin utilities; use `tw-*` only when `!important` specificity is genuinely needed [CONVENTION]. More concretely, per `stylelint.config.ts` and `tailwind.config.ts`:
  - Tailwind is configured with `prefix: 'tw-'` and `important: true`, and a custom `blocklist` bans a number of base utilities (`hidden`, `transform`, `shadow`, etc.) because the project does not load Tailwind's base reset — don't assume unprefixed/blocklisted utility classes work.
  - Theme colors/font sizes/border radii are mapped from CSS custom properties (`--color-*` variables defined in theme CSS files), not hardcoded in the Tailwind config — add new design tokens as CSS variables first.
  - **Element visibility anti-pattern (explicit, enforced by convention):** do **not** use the `[hidden]` attribute, a `.hidden` class, inline `style="display:none"`, or jQuery-style `.show()`/`.hide()` to toggle visibility. Use the `tw-hidden` utility class or the `showElem`/`hideElem`/`toggleElem` helpers from `utils/dom.js` instead.
  - Stylelint enforces (via `@stylistic/stylelint-plugin` and related rules): double-quoted strings, lowercase hex colors/units/pseudo-selectors, `declaration-strict-value` and `no-unknown-custom-properties` checks — treat `stylelint.config.ts` as the source of truth for CSS formatting beyond the two high-level conventions above.

## Required Libraries & Packages

### Core/Framework
- `xorm.io/xorm` + `xorm.io/builder` — the only DB/query layer. Do not introduce `database/sql` directly or another ORM.
- `github.com/yuin/goldmark` (66 files) — sole markdown renderer.
- `github.com/urfave/cli/v3` — CLI subcommand framework used throughout `cmd/`; pair new commands with the `cli.OsExiter` + log-flush pattern (see Common Patterns).

### Internal/Private (MUST-USE)
- `gitea.dev/modules/...` (2500 files) — shared utility layer; check here before writing generic helpers (string/time/path/http utils, etc.).
- `gitea.dev/models/...` (917 files) — canonical data access; new persistence code belongs here, never duplicated ad hoc in services/routers.
- `gitea.dev/services/...` (284 files) — business logic sits above models; routers should call into services, not models directly, for non-trivial logic.
- `gitea.dev/routers/...` (145 files) — HTTP handler layer.
- `gitea.dev/modules/json` — **mandatory replacement for `encoding/json`**, enforced by `depguard`. Import it exactly where you'd import `encoding/json`.
- `gitea.dev/modules/util` — provides `util.ErrorWrap`, `util.NewInvalidArgumentErrorf`, `util.ErrNotExist`/`util.ErrPermissionDenied` sentinels used for error construction.
- `gitea.dev/modules/git/internal` — do not use directly; go through the module's own `AddXxx` wrapper functions (internal facade pattern), per `depguard`.

### Preferred third-party
- `github.com/stretchr/testify` (589 files) — de facto assertion/mocking standard, enforced via `testifylint` linter [ENFORCED] (with `empty`, `go-require`, `require-error` checks disabled — don't rely on those specific checks).
- stdlib-first: `strings`, `fmt`, `context`, `time`, `net/http`, `errors`, `io`, `os`, `strconv`, `bytes`, `path/filepath`, `net/url`, `sync`, `regexp`, `slices` are the dominant stdlib packages — reach for stdlib before adding a new dependency. Enforced in spirit by `usestdlibvars` linter.

### Explicitly forbidden — do NOT introduce
| Banned | Use instead |
|---|---|
| `encoding/json` | `gitea.dev/modules/json` |
| `github.com/unknwon/com` | `gitea.dev/modules/util` |
| `io/ioutil` | `os` / `io` |
| `golang.org/x/exp` | stdlib equivalents (banned as experimental) |
| `gopkg.in/ini.v1` | Gitea's own config system |
| `gitea.com/go-chi/cache` | Gitea's own cache system |
| `github.com/pkg/errors` | builtin `errors` + `%w` wrapping |

All of the above are [ENFORCED] via `depguard` in `.golangci.yml` — violations fail CI, not just review.

## Common Patterns

### CLI Entrypoint Pattern
- `main.go` overrides `cli.OsExiter` and explicitly calls `log.GetManager().Close()` both inside the custom exiter **and** after `RunMainApp` returns normally — this is called out in-code as a **MUST**, "otherwise there will be log loss." When adding new exit paths in `cmd/`/`main.go`, ensure log flushing happens on every exit route, not just the happy path.

### Error Handling
- Sentinel errors via `util.ErrorWrap`:
  ```go
  var ErrBranchIsProtected = util.ErrorWrap(util.ErrPermissionDenied, "branch is protected")
  ```
- Custom error structs implement `Error() string` and `Unwrap() error` back to a shared sentinel:
  ```go
  func (err ErrTaskDoesNotExist) Unwrap() error { return util.ErrNotExist }
  ```
- Dominant propagation idiom is `fmt.Errorf("...: %w", err)` — always wrap, never re-stringify (`errors.New(s + err.Error())` seen once in `v286.go` and is an anti-pattern — loses `errors.Is`/`errors.As`).
- Log-and-continue for recoverable per-record failures inside loops/migrations:
  ```go
  log.Warn("skip action_run id=%d when resolving commit status commit SHA: %v", id, err)
  continue
  ```
- `panic()` only for programmer-error/invariant violations with an explanatory string (`models/db/context.go`); `log.Fatal` used in migrations for truly unrecoverable states (e.g. unrecognized DB dialect) — these are two distinct, intentionally separate mechanisms; don't conflate them.
- Justify `nil, nil` returns with `//nolint:nilnil` and an explanation — [ENFORCED] `nolintlint` requires specific, non-empty justification for every `//nolint`.

### Data Access / API Patterns
- Always thread `context.Context` as the first parameter of DB-touching functions.
- Never touch xorm's engine directly outside `models/db` — go through `db.GetEngine(ctx)`.
- Wrap transactional application code in `db.WithTx(ctx, func(ctx context.Context) error { ... })`.
- Migrations use the raw session idiom instead (they can't use the higher-level `db` helpers):
  ```go
  sess := x.NewSession()
  defer sess.Close()
  sess.Begin()
  ...
  sess.Commit()
  ```
- Large-table migrations use paginated batch loops:
  ```go
  const batchSize = 100
  for start := 0; ; start += batchSize {
      ... .Limit(batchSize, start) ...
      if len(results) == 0 { break }
  }
  ```
  with periodic intermediate commits (`if start%1000 == 0 { sess.Commit(); sess.Begin() }`) to bound transaction size.
- Migration engine is always passed explicitly as a parameter (`db.EngineMigration`) — never referenced globally.
- Dialect branching for cross-DB SQL: `switch { case setting.Database.Type.IsMySQL(): ... }`.

### Component/Module Structure
- Standard model file layout: license header → constants/enums → struct → `func init() { db.RegisterModel(new(X)) }` → methods.
- xorm schema via tags: `xorm:"pk autoincr"`, `xorm:"index"`, `xorm:"-"`, `xorm:"JSON TEXT"`.
- Use `TableName()` override to bind a struct (live model or migration-local frozen copy) to an existing table name.
- Implement `TableIndices()` for composite indices as an alternative/supplement to struct tags.
- **Every migration file is self-contained**: one exported entrypoint function; any needed model structs are redefined locally in that file, never imported live. Add a rationale comment (see existing examples) explaining the copy.

### State Management
- No global mutable caches for cross-record lookups in migrations — pass a locally-scoped `map[K]V` cache as a function parameter, created once at the top-level entrypoint:
  ```go
  func getRepoLinkCached(x db.EngineMigration, cache map[int64]string, repoID int64) (string, error)
  ```
- Long-running migration loops use ticker-based progress logging (`time.NewTicker(5*time.Second)` + non-blocking `select`).

## Import & Export Conventions

- **Three-block Go import grouping** [ENFORCED by `gci` formatter, CONFIRMED via `main.go`/`main_timezones.go`]: stdlib → blank line → `gitea.dev/...` internal (including blank-import side-effect groups) → blank line → third-party.
- Custom import order confirmed in `.golangci.yml` gci config: standard → `gitea.dev` prefix → blank → default.
- Domain-suffixed aliases (`_model`, `_module`) required when importing cross-package model/module dependencies, e.g. `issues_model "gitea.dev/models/issues"`.
- Blank imports for side effects must carry an explanatory comment: `_ "image/jpeg" // Needed for jpeg support` (confirmed pattern: `main.go`'s `// register supported doc types` block and `main_timezones.go`'s multi-line comment justifying `_ "time/tzdata"`).
- TypeScript: use `import type {...}` for type-only imports (confirmed via `stylelint.config.ts`, `tailwind.config.ts`, `types.d.ts`).
- Formatting also runs through `gofumpt` with `extra-rules` — [ENFORCED], run `make fmt` before committing.

## Testing Conventions

- Unit tests: `_test.go` colocated with source; `main_test.go` per package for shared setup.
- Assertions: `testify` (`assert`/`require`) is the standard — 589 files use it; don't introduce a second assertion library.
- Integration tests: YAML fixtures in `models/fixtures/<entity>.yml`, loaded via fixture-based DB test setup.
- Migration tests: file `v<N>_test.go` mirrors `v<N>.go`, defines pre-migration schema structs locally, uses `migrationtest.PrepareTestEnv`/`migrationtest.LoadTableSchemasMap`.
- **E2E (Playwright)**: tests live under `./tests/e2e/`, matched via a `/.*\.test\.ts/` pattern, with output written to `./tests/e2e-output/`. Timeouts scale via the `GITEA_TEST_E2E_TIMEOUT_FACTOR` env var; multiple browser projects are configured (Chromium, Firefox) with clipboard permissions granted. Run via `GITEA_TEST_E2E_FLAGS='<filepath>' make test-e2e`.
- **JS/TS unit tests (Vitest)**: source under `web_src/**/*.test.ts` and `tools/eslint-rules/**/*.test.ts`; environment is `happy-dom`; `isolate: false` with concurrent test sequencing; a custom `stringPlugin()` supports raw string imports; Vue plugin integration is enabled. Run via `pnpm exec vitest <path-filter>`.
- [ENFORCED] linter exclusions: `dupl`/`errcheck`/`staticcheck`/`unparam` are skipped in `_test.go` files, and `dupl`/`errcheck` skipped in `models/migrations/v*` — don't assume these checks apply there, but also don't rely on the exclusion to write sloppy test/migration code.
- Target: keep integration/e2e tests fast (sub-2s runtime goal per AGENTS.md) — scope tests narrowly, avoid unnecessary full-suite setup.

## Internal Frameworks & Utilities

- `gitea.dev/modules/util` — error sentinels (`ErrNotExist`, `ErrPermissionDenied`), `ErrorWrap`, `NewInvalidArgumentErrorf`. Use instead of ad hoc error construction.
- `gitea.dev/modules/json` — drop-in `encoding/json` replacement; mandatory.
- `gitea.dev/modules/log` — `log.Error`, `log.Warn`, `log.Info`, `log.Fatal` — the standard logging facade; don't use `fmt.Println`/stdlib `log`. Note the CLI entrypoint pattern of explicit `log.GetManager().Close()` calls on every exit path (see Common Patterns → CLI Entrypoint Pattern).
- `db.GetEngine(ctx)` / `db.WithTx(ctx, fn)` — the only sanctioned entry points to xorm in application code (not migrations).
- `db.RegisterModel(new(X))` in `init()` — required for every new persisted struct so xorm's sync/schema tooling picks it up.
- `migrationtest` package (`models/migrations/migrationtest/`) — helpers for migration test setup; use rather than hand-rolling schema fixtures.
- `utils/dom.js` — `showElem`/`hideElem`/`toggleElem` helpers; the sanctioned way to toggle element visibility from TypeScript (see CSS anti-pattern note above).

## Anti-patterns to Avoid

- Do **not** import live `models` structs into `models/migrations/*` — [ENFORCED] by `depguard` ("migrations must not depend on the models package" / "must not depend on modules/structs"). Redefine the needed shape locally instead.
- Do **not** use `encoding/json`, `io/ioutil`, `github.com/unknwon/com`, `golang.org/x/exp`, `gopkg.in/ini.v1`, `gitea.com/go-chi/cache`, or `github.com/pkg/errors` — see replacement table above. [ENFORCED]
- Do **not** build errors via string concatenation (`errors.New(s + err.Error())`) — always wrap with `%w`; the one instance of this in `v286.go` is a known inconsistency, not a pattern to copy.
- Do **not** mix transaction styles — application code uses `db.WithTx`, migrations use raw `sess.Begin()/Commit()`. Don't introduce a third pattern, and don't skip explicit `Begin`/`Commit` in migrations that mutate schema (one file, `v331.go`, does this inconsistently with `NewSession`/`defer Close` only — treat as an outlier, not a model).
- Do **not** rely on a single global test-naming convention — `TestX` vs `Test_X` both exist; pick `Test_<Name>` for new code but don't mass-rename existing tests.
- Do **not** access `gitea.dev/modules/git/internal` directly — use the package's `AddXxx` wrapper functions. [ENFORCED via depguard]
- Do **not** put business logic directly in `routers/` — route handlers should delegate to `services/`; keep `models/` free of HTTP/business concerns.
- Do **not** use `?.`/`??` in TypeScript when the value is guaranteed non-null — prefer `!` [CONVENTION, AGENTS.md]. This does not apply to genuinely optional values (e.g. env vars) — see the qualified TypeScript rule under Coding Style & Naming.
- Do **not** use the `[hidden]` attribute, a `.hidden` class, inline `style="display:none"`, or jQuery-style `.show()`/`.hide()` to control element visibility — use the `tw-hidden` utility class or `showElem`/`hideElem`/`toggleElem` from `utils/dom.js` instead.
- Do **not** assume Go files are entirely invisible to frontend tooling — they're excluded from Go/TS *linting*, but Tailwind's content scanner does read `.go` files for class extraction. Don't be surprised by Tailwind class usage inside `.go` templates.

## Build, Lint & CI

- **Build orchestration:** root `Makefile` — key targets: `make help`, `make fmt`, `make lint-go`, `make lint-js`, `make tidy`, `make frontend`.
- **Go linting** [ENFORCED, golangci-lint v2, opt-in list only — `linters.default: none`]: `bidichk`, `bodyclose`, `depguard`, `dupl`, `errcheck`, `forbidigo`, `gocheckcompilerdirectives`, `gocritic`, `govet`, `ineffassign`, `mirror`, `modernize`, `nakedret`, `nilnil`, `nolintlint`, `perfsprint`, `revive`, `staticcheck`, `testifylint`, `unconvert`, `unparam`, `unused`, `usestdlibvars`, `usetesting`, `wastedassign`.
- `revive` runs at `severity: error` with curated rules (blank-imports, context-as-argument, exported comments, error-strings, package-comments, var-naming — underscore exception for migration packages).
- `staticcheck`: all checks enabled except ST1003, ST1005, QF1001, QF1006, QF1008.
- `forbidigo` is skipped in `cmd/`; `dupl` is skipped for webhook-related matches — don't assume these rules apply uniformly.
- Formatters: `gci` (import order) and `gofumpt` (with extra rules) — run automatically via `make fmt`; CI will fail on unformatted code.
- After any `go.mod` change, run `make tidy`.
- **JSON linting:** dedicated `eslint.json.config.ts` (via `@eslint/json`) lints `.json`/`.json5`/`.jsonc` files with per-path variants (e.g. trailing commas allowed for `.vscode`/`tsconfig.json`) — separate from the main TS/Vue ESLint flat config.
- **Docker:** multi-stage build — frontend built first on native `$BUILDPLATFORM` (Node/pnpm) to avoid QEMU cross-build cost, backend built per-target-platform with `TAGS="bindata timetzdata $TAGS"`.
- **Commits/PRs:** Conventional Commits required (`type(scope): subject`, fixed vocabulary: build, ci, chore, docs, feat, enhance, fix, perf, refactor, revert, style, test). No force-push/amend/squash on open PRs — push new commits only. AI-assisted commits require `Assisted-by: AGENT_NAME:MODEL_VERSION` trailer; `Co-Authored-By`/`Signed-off-by` are forbidden for AI contributions.