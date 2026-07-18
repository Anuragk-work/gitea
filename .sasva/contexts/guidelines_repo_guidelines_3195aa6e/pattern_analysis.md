# Unified Code Convention Analysis — Gitea-style Codebase (Models + Migrations)

*Synthesized from 3 chunk analyses covering `models/`, `models/migrations/v1_*`, and `cmd/` packages*

---

## 1. Naming Conventions

**Files**
- Go source: `snake_case.go` (`protected_branch.go`, `run_job.go`, `admin_auth_ldap_test.go`) — Chunk 1.
- Migration files named strictly by numeric DB version: `v100.go`, `v111.go`, `v128.go`, `v151.go`, `v156.go`, `v180.go`, `v210.go`, `v212.go`, `v229.go`, `v240.go`, `v259.go`, `v276.go`, `v286.go`, `v309.go`, `v317.go`, `v321.go`, `v326.go`, `v331.go`, `v70.go`, `v75.go` — Chunks 2 & 3.
- Migration packages versioned `v1_10` … `v1_27`, underscore-separated major_minor — Chunk 2.

**Types/Structs**
- `PascalCase`, domain models named after singular DB tables: `ActionRunJob`, `ProtectedBranch`, `OAuth2Application`, `Task` — Chunk 1.
- **Migration-local frozen struct snapshots** — a strong cross-chunk convention: real models are *never* imported into migrations; instead structs are redefined locally, sometimes prefixed to avoid collision:
  - `Repository`, `PullRequest`, `User`, `ProtectedBranch` redefined verbatim (Chunk 2: v1_11/v111.go, v1_12/v128.go, v1_14/v156.go), with explicit rationale comment in v1_14/v156.go: *"Copy paste from models/repo.go because we cannot import models package."*
  - `migrationRepository`, `migrationActionRun`, `migrationActionRunJob`, `migrationCommitStatus`, `migrationPayloadCommit`, etc., using a `migration`-prefix convention (Chunk 3: v326.go).
  - `improveNotificationTableIndicesAction`, `improveActionTableIndicesAction` — action-suffixed naming tied to migration purpose (Chunk 3: v309.go, v317.go).
  - Old-version-prefixed constants `v16UnitTypeCode`, `v16UnitTypeIssues` (Chunk 3: v70.go) to avoid clashing with current model constants.
  - Explicit rationale comment repeated in Chunk 3 (v326.go): *"Frozen subsets of modules/structs payload types... Inlined so the migration is insulated from future field changes."*

**Package-scoped error types** (Chunk 1)
- `Err<Noun>` pattern with matching `IsErr<Noun>(err) bool` type-assertion helper:
  ```go
  func IsErrTaskDoesNotExist(err error) bool {
      _, ok := err.(ErrTaskDoesNotExist)
      return ok
  }
  ```
  Seen in `models/admin/task.go`, `models/issues/comment.go`, `models/git/protected_branch.go` (`ErrBranchIsProtected`), `models/auth/oauth2.go` (`ErrOAuth2AuthorizationCodeInvalidated`).

**Methods**
- Verb-based `Load*` for lazy relation loading: `LoadRepo`, `LoadDoer`, `LoadOwner`, `LoadRun`, `LoadAttributes`, `LoadActUser` — consistent across `models/admin/task.go`, `models/actions/run_job.go`, `models/activities/action.go`, `models/git/protected_branch.go` (Chunk 1).
- Boolean getters: `CanUser*`, `Is*`, `Has*` (`CanUserPush`, `CanUserForcePush`, `CanBypassBranchProtection`, `HasContentSupport`) — `models/git/protected_branch.go`, `models/issues/comment.go` (Chunk 1).
- Migration entrypoints: PascalCase, verb-first, describing the DB change — `UpdateMigrationServiceTypes`, `AddBranchProtectionCanPushAndEnableWhitelist`, `FixMergeBase`, `AddPackageTables`, `AddActionsTables`, `AdjustDBForSha256`, `ImproveNotificationTableIndices`, `AddNewIndexForUserDashboard`, `FixCommitStatusTargetURLToUseRunAndJobID`, `AddActionRunAttemptModel`, `AddIssueDependencies`, `ClearNonusedData` (Chunks 2 & 3, spanning v1_10 through v331/v70/v75).
- Unexported migration helpers: camelCase verbs — `getRemoteAddress`, `migratePullMirrors`, `removeCredentials`, `repoPath` (Chunk 2); `getRepoLinkCached`, `getJobIDByIndexCached`, `parseTargetURL`, `migrateCommitStatusTargetURLForGroup` (Chunk 3).

**Constants**
- `iota`-based enum blocks with trailing `// N` value comments (Chunk 1: `models/activities/action.go` ActionType, `models/issues/comment.go` CommentType).
- PascalCase constants even in unexported/local scope: `PlainGitService`, `GithubService` (v1_10/v100.go), `ReviewTypeApprove`, `AccessModeOwner` (v1_11/v111.go), `TaskTypeMigrateRepo` (v1_15/v180.go) — Chunk 2.

**Private/internal fields**
- lowerCamelCase unexported fields tagged `xorm:"-"` for computed/transient state, e.g. `globRule`, `isPlainName` in `ProtectedBranch` (Chunk 1).

**Test naming — inconsistent across the codebase (flagged in Chunk 1 as anti-pattern, corroborated by Chunk 3):**
- `Test<FeatureName>` style: `TestAddLdapBindDn`, `TestCliCmd`, `TestCliCmdError` (`cmd/admin_auth_ldap_test.go`, `cmd/cmdtest/cmd_test.go`).
- `Test_<Name>` style: `Test_SSHParsePublicKey`, `Test_CheckPublicKeyString`, `Test_calcFingerprint` (`models/asymkey/ssh_key_test.go`).
- Migration tests follow the `Test_` + PascalCase-migration-name convention: `Test_UseLongTextInSomeColumnsAndFixBugs` (`v321_test.go`, Chunk 3) — matches the `_test.go`/`Test_` half of the split, but the two conventions coexist project-wide without reconciliation.

**Non-Go**: `vite.config.ts` uses camelCase for functions/vars (`failOnWarningsPlugin`, `commonViteOpts`, `viteDevServerPort`) and PascalCase for imported types (`InlineConfig`, `Plugin`, `Rolldown`) — Chunk 3.

---

## 2. Import/Export Patterns

**Universal 3-block import grouping** (stdlib → internal `gitea.dev/...` → third-party), separated by blank lines. Confirmed identically across all three chunks:
- Chunk 1: `models/actions/run_job.go`, `models/git/protected_branch.go`, `models/auth/oauth2.go`, `cmd/cmdtest/cmd_test.go`.
- Chunk 2: `models/migrations/base/db.go`, `v1_16/v210.go`, `models/migrations/migrationtest/tests.go`.
- Chunk 3: `v286.go`, `v309.go`, `v317.go`, `v326.go`, `v331.go`, `v70.go`, `v75.go`, `models/repo.go`.

**Domain-suffixed aliasing convention** (`_model` / `_module` suffix) — consistent across all layers:
- `repo_model "gitea.dev/models/repo"`, `user_model "gitea.dev/models/user"`, `issues_model "gitea.dev/models/issues"`, `access_model "gitea.dev/models/perm/access"`, `webhook_module "gitea.dev/modules/webhook"` — Chunk 1 (`models/actions/run_job.go`, `models/activities/action.go`, `models/git/protected_branch.go`), Chunk 2 (`v1_21/v276.go`), Chunk 3 (`models/repo.go`, `v326.go`).

**Mandatory license header** — every Go file in Chunk 1's sample begins with:
```go
// Copyright <year> The Gitea Authors. All rights reserved.
// SPDX-License-Identifier: MIT
```

**Central migration registry** — `migrations.go` imports every versioned sub-package `v1_6`...`v1_27` and registers migrations in one ordered list via `newMigration(id, desc, fn)` (Chunk 2).

**Blank import for side effects with explanatory comment**: `_ "image/jpeg" // Needed for jpeg support` (`models/repo.go`, Chunk 3).

**TS-specific**: explicit `import type {...} from 'vite'` for type-only imports (`vite.config.ts`, Chunk 3).

---

## 3. Error Handling

**Sentinel errors in `var (...)` blocks**, often via `errors.New` or wrapped with an internal helper:
- `models/auth/oauth2.go` (`ErrOAuth2AuthorizationCodeInvalidated`, `ErrOAuth2GrantStaleCounter`), `models/git/protected_branch.go`: `var ErrBranchIsProtected = util.ErrorWrap(util.ErrPermissionDenied, "branch is protected")` (Chunk 1).
- Also `util.NewInvalidArgumentErrorf` (`models/issues/comment.go`, Chunk 1).

**Custom error structs** implementing `Error() string` and `Unwrap() error`, unwrapping to a shared sentinel (`util.ErrNotExist`):
```go
func (err ErrTaskDoesNotExist) Unwrap() error { return util.ErrNotExist }
```
(`models/admin/task.go`, `models/issues/comment.go` — Chunk 1).

**`%w` wrapping with `fmt.Errorf`** — the dominant error-propagation idiom across the entire codebase:
- Chunk 1: `models/actions/run_job.go` (`"job %d single workflow: unable to parse: %w"`), `models/avatars/avatar.go`.
- Chunk 2: `fmt.Errorf("Find: %w", err)` (v1_12/v128.go), `fmt.Errorf("unable to allow start session. Error: %w", err)` (v1_16/v210.go), `fmt.Errorf("error selecting open milestone IDs: %w", err)` (v1_18/v229.go).
- Chunk 3: `fmt.Errorf("alter column '%s' of table '%s' failed: %w", ...)` (v286.go), `fmt.Errorf("query action_run: %w", err)` (v326.go), `fmt.Errorf("Error creating issue_dependency_table column definition: %w", err)` (v70.go).

**Immediate return with logged error** — repeated boilerplate throughout migrations:
```go
if err := sess.Table(tempTableName).CreateTable(bean); err != nil {
    log.Error("Unable to create table %s. Error: %v", tempTableName, err)
    return err
}
```
(`base/db.go`, `v1_13/v151.go` — **verbatim duplicated**, Chunk 2).

**Graceful degradation: log-and-continue on per-record failures** rather than aborting the whole operation — consistent pattern in both models and migrations:
- Chunk 1: `log.Error`/`log.Warn` for recoverable issues in `models/admin/task.go`, `models/git/protected_branch.go`, `models/activities/action.go`.
- Chunk 2: `v1_14/v156.go` (`log.Warn("Release[%d] is orphaned...")`, `continue`).
- Chunk 3: `v326.go` (`log.Warn("skip action_run id=%d when resolving commit status commit SHA: %v", ...); continue`), contrasted with hard `return err` for schema-altering operations in the same file.

**`log.Fatal` for unrecoverable states**: `log.Fatal("Unrecognized DB")` (v1_13/v151.go, Chunk 2) — notably inconsistent with the `panic()` convention used in models (see below) — two different mechanisms for "this should never happen."

**`panic()` reserved for programmer errors/invariant violations** with explanatory string: `models/db/context.go` — `panic("cond is invalid in db.Get(ctx, cond). This should not be possible.")` (Chunk 1).

**`//nolint:nilnil`** justifying explicit `nil, nil` returns: `models/auth/oauth2.go`, `cmd/admin_auth_ldap_test.go` (Chunk 1).

**Anti-pattern / inconsistency**: `errors.New(s + " " + err.Error())` used to build an ad-hoc error from a SQL string + wrapped error in `v286.go` (Chunk 3), inconsistent with the `%w`-wrapping convention used elsewhere in the very same file — loses `errors.Is`/`errors.As` unwrap capability.

---

## 4. Component/Module Structure

**Standard model file layout** (Chunk 1): header comment → constants/enums → struct definition → `func init() { db.RegisterModel(new(X)) }` → methods. Repeated in `models/actions/run_job.go`, `models/activities/action.go`, `models/admin/task.go`, `models/auth/oauth2.go`, `models/avatars/avatar.go`, `models/git/protected_branch.go`.

**xorm tag-driven schema definition**: `xorm:"pk autoincr"`, `xorm:"index"`, `xorm:"-"` (transient fields), `xorm:"JSON TEXT"` (slice/map fields) — used consistently across all model files (Chunk 1).

**`TableName()` override** to map a struct to a custom/existing table name — used both in live models and in migrations to bind local frozen structs to real tables:
- `OAuth2Application.TableName()` (Chunk 1, `models/auth/oauth2.go`).
- `func (*improveNotificationTableIndicesAction) TableName() string { return "notification" }` (Chunk 3, v309.go, v317.go, v331.go for `actionRunAttempt`/`actionArtifact`/`actionRun`).

**`TableIndices()` implementing xorm's interface** for composite indices, used as an alternative to struct tags — appears in both live models and migrations:
- `models/activities/action.go` (Chunk 1).
- v309.go, v317.go with explicit comment "Add the individual indices that were previously defined in struct tags" (Chunk 3).

**Migration file self-containment**: every migration file = one exported entrypoint function, defining its own local/frozen copies of any model structs it touches rather than importing live models — consistent across Chunk 2 (v1_10/v100.go, v1_11/v111.go, v1_12/v128.go, v1_17/v212.go, v1_19/v240.go, v1_21/v276.go) and Chunk 3 (v286.go, v309.go, v317.go, v326.go, v331.go, v70.go, v75.go), with explicit rationale comments in both (see §1).

**Dual migration function signatures**, unified via a generic wrapper:
- `func(db.EngineMigration) error` and `func(context.Context, db.EngineMigration) error`, reconciled by `newMigration[T ...]` in `models/migrations/migrations.go` (Chunk 2).

**Session lifecycle pattern**, near-identical across dozens of files:
```go
sess := x.NewSession()
defer sess.Close()
sess.Begin()
...
sess.Commit()
```
(Chunk 2: v1_13/v151.go, v1_14/v156.go, v1_15/v180.go, v1_16/v210.go, v1_21/v276.go; Chunk 3: v286.go explicit `Begin`/`Commit`, v331.go simplified `NewSession`/`defer Close` without explicit Begin/Commit — **minor inconsistency** in transaction rigor).

**Batch iteration pattern** for large-table migrations:
```go
const batchSize = N
for start := 0; ; start += batchSize {
    ... Limit(batchSize, start) ...
    if len(results) == 0 { break }
}
```
Repeated near-identically in v1_10/v100.go, v1_14/v156.go, v1_15/v180.go, v1_16/v210.go, v1_21/v276.go (Chunk 2).

**Periodic commit inside large loops** to bound transaction size: `if start%1000 == 0 { sess.Commit(); sess.Begin() }` (v1_21/v276.go, Chunk 2).

**Test file mirrors migration file** with `_test.go` suffix, defining local pre-migration schema structs and using `migrationtest.PrepareTestEnv`/`migrationtest.LoadTableSchemasMap` helpers (`v321_test.go`, Chunk 3).

---

## 5. State/Data Flow

**`context.Context` as first parameter** of virtually every DB-touching function — enforced across all model files (Chunk 1).

**Single DB access chokepoint**: `db.GetEngine(ctx)` — never direct xorm engine access outside the `models/db` package. Seen in `models/admin/task.go`, `models/avatars/avatar.go`, `models/dbfs/dbfile.go`, `models/db/install/db.go` (Chunk 1).

**Transactions via `db.WithTx(ctx, func(ctx context.Context) error {...})`** wrapper in application code (Chunk 1) — contrasts with the raw `sess.Begin()/Commit()` idiom used throughout migrations (Chunk 2/3); the two DB layers (live models vs. migrations) intentionally use different transaction abstractions, consistent with migrations being isolated from the live `db` package's higher-level helpers.

**Migration engine passed explicitly as parameter**: `db.EngineMigration` is threaded into every migration function — no global engine reference used directly in migration logic (Chunk 2, all v1_* files).

**Dialect-based branching** for cross-DB SQL differences: `switch { case setting.Database.Type.IsMySQL(): ... case IsPostgreSQL(): ... case IsSQLite3(): ... }`, and `x.Dialect().URI().DBType` compared against `schemas.MYSQL/MSSQL/POSTGRES` (Chunk 2: `base/db.go`, `v1_13/v151.go`, `v1_16/v210.go`).

**Ticker-based progress logging** in long-running loops: `ticker := time.NewTicker(5 * time.Second)` + `select { case <-ticker.C: log.Info(...) default: }` (v1_12/v128.go, Chunk 2).

**Caching via locally-scoped `map[int64]X` passed as a function parameter**, rather than package/global state — a cleaner alternative to the module-global cache pattern:
```go
func getRepoLinkCached(x db.EngineMigration, cache map[int64]string, repoID int64) (string, error)
func getJobIDByIndexCached(x db.EngineMigration, cache map[int64][]int64, runID, jobIndex int64) (int64, bool, error)
```
(v326.go, Chunk 3) — cache maps are created once in the top-level entrypoint and threaded through helper calls.

---

## 6. API / Data Access Patterns

**xorm exclusively for DB access** — no raw `database/sql` usage; `x.Sync(...)`, `x.Exec(...)`, `sess.Where(...).Find(...)`, `sess.ID(...).Cols(...).Update(...)` used throughout all model and migration files (Chunk 2, generalized from all chunks' file samples).

**`xorm.io/builder` for complex/composable conditions** instead of raw SQL string concatenation: `builder.Eq{...}.And(builder.Gte{...})` (v1_15/v180.go), `builder.Select("count(*)").From("issue").Where(builder.Eq{...})` (v1_18/v229.go) — Chunk 2.

**Manual `strings.Builder` SQL construction** reserved for cases the ORM/builder can't express (e.g., dynamic column lists for table recreation) — **verbatim duplicated block** between `base/db.go` and `v1_13/v151.go` (Chunk 2; also flagged as anti-pattern below).

**Git shell-out via internal wrapper**: `gitcmd.NewCommand(...).AddDashesAndList(...).WithDir(...)` — used where migrations need actual git-tree/file access rather than DB-only changes (Chunk 2, truncated in source but confirmed pattern).

---

## 7. Utilities / Shared Helpers

- **`util.ErrorWrap`** — internal helper for wrapping/tagging sentinel errors with additional context while preserving the original sentinel for `Unwrap()` (`models/git/protected_branch.go`, Chunk 1).
- **`util.NewInvalidArgumentErrorf`** — internal helper for formatted invalid-argument errors (`models/issues/comment.go`, Chunk 1).
- **`util.ErrNotExist`** — shared sentinel that all `ErrXDoesNotExist`/`ErrXNotExist` types unwrap to, enabling uniform `errors.Is(err, util.ErrNotExist)` checks across the codebase (Chunk 1).
- **`log` package (`gitea.dev/modules/log`)** — the single logging facility used everywhere in place of ad-hoc `fmt.Println`/panics for recoverable conditions; `log.Error`, `log.Warn`, `log.Info`, `log.Fatal` all appear across models and migrations (Chunks 1–3).
- **`migrationtest` package** — shared test helpers (`PrepareTestEnv`, `LoadTableSchemasMap`) specifically for migration test files (Chunk 3, `v321_test.go`).
- **Generic migration signature adapter** `newMigration[T ...]` in `models/migrations/migrations.go` — a shared utility unifying the two migration function signatures into one registry entry point (Chunk 2).

---

## 8. Testing Patterns

- **Migration tests** follow `<version>_test.go` naming mirroring the migration file, and redefine local pre-migration-schema structs (matching the "frozen snapshot" convention used in the migrations themselves) — `v321_test.go` using `migrationtest.PrepareTestEnv`/`migrationtest.LoadTableSchemasMap` (Chunk 3).
- **Test function naming is inconsistent codebase-wide** (see §1 anti-pattern): `TestXxx` (no underscore) in `cmd/admin_auth_ldap_test.go`, `cmd/cmdtest/cmd_test.go`; `Test_Xxx` (underscore) in `models/asymkey/ssh_key_test.go` and migration tests (`v321_test.go`). No single convention dominates; migrations lean toward `Test_` + PascalCase matching the function under test.
- **`//nolint:nilnil`** annotations appear in test-adjacent code to document intentional `nil, nil` returns (`cmd/admin_auth_ldap_test.go`, Chunk 1).

---

## 9. Anti-Patterns / Inconsistencies

1. **Test naming convention is not unified** — `TestCliCmd`-style vs. `Test_SSHParsePublicKey`-style coexist with no discernible rule for which package uses which (Chunk 1: `cmd/*_test.go` vs. `models/asymkey/ssh_key_test.go`; partially echoed by migration tests using the underscore style, Chunk 3).
2. **Verbatim code duplication across migration files**: the "no columns in new table" `errors.New` check and the full `strings.Builder`-based dynamic table-recreation SQL logic are duplicated near-identically between `base/db.go` and `v1_13/v151.go` (Chunk 2) instead of being factored into a shared helper.
3. **Inconsistent error-construction style within a single file**: `v286.go` mixes idiomatic `%w`-wrapped `fmt.Errorf` with an ad-hoc `errors.New(s + " " + err.Error())` that discards wrap semantics (Chunk 3).
4. **Two different "this should never happen" mechanisms**: models use `panic(...)` with an explanatory string for invariant violations (`models/db/context.go`, Chunk 1), while migrations use `log.Fatal("Unrecognized DB")` for the analogous "unexpected/unsupported case" (v1_13/v151.go, Chunk 2) — no unified convention for unrecoverable-but-not-a-bug situations.
5. **Transaction rigor varies across migration files**: most use explicit `sess.Begin()`/`sess.Commit()` (v1_13–v1_21 range, Chunk 2; v286.go, Chunk 3), while v331.go (Chunk 3) only does `NewSession()`/`defer sess.Close()` without explicit `Begin`/`Commit`, relying on auto-commit semantics — an inconsistency in explicitness rather than necessarily a bug.
6. **Two parallel "don't touch the live model" conventions with different naming schemes**: Chunk 2-era migrations simply reuse the real struct name unmodified (`Repository`, `PullRequest`) with a code comment as the only signal it's a copy, whereas Chunk 3-era migrations adopt an explicit `migration`-prefix (`migrationRepository`, `migrationPullRequest`) or `Action`-suffix naming scheme — indicating the convention evolved over time but was never back-applied to older migration files, leaving both styles live in the same codebase.