# Install & Private Routers

This page covers the two special-purpose routers that sit outside the normal
"session + web UI" flow described in [Middleware Chain](middleware-chain.md):
`routers/install` (the first-run installation wizard) and `routers/private` (the
internal-only API used by Gitea's own sub-processes).

## `routers/install` — the pre-install wizard

Before `setting.InstallLock` is `true`, the server process runs
`routers.InitWebInstallPage(ctx)` (locales + settings-for-install + SVG init) and
serves `install.Routes()` **instead of** `routers.NormalRoutes()`. This is a
completely separate, much smaller router — the normal web UI, REST API, and internal
API are not mounted at all until installation completes.

### Route registration (`routers/install/routes.go`)

```go
func Routes() *web.Router {
	base := web.NewRouter()
	base.BeforeRouting(common.ProtocolMiddlewares()...)

	base.Methods("GET, HEAD", "/assets/*", public.FileHandlerFunc())

	r := web.NewRouter()
	r.AfterRouting(common.MustInitSessioner(), installContexter())

	r.Get("/", Install)   // must be root: install.js uses window.location to replace "localhost" AppURL
	r.Post("/", web.Bind(forms.InstallForm{}), SubmitInstall)
	r.Get("/post-install", InstallDone)

	r.Get("/-/web-theme/list", misc.WebThemeList)
	r.Post("/-/web-theme/apply", misc.WebThemeApply)
	r.Get("/api/healthz", healthcheck.Check)

	r.NotFound(installNotFound)

	base.Mount("", r)
	return base
}
```

| Route | Handler | Notes |
|---|---|---|
| `GET /` | `Install` | Renders the install form, pre-filled from current `setting.*` values (DB connection, app name, repo/LFS/log paths, SMTP, etc.). If `setting.InstallLock` is already `true` (e.g. the config file was edited manually mid-flow), it delegates straight to `InstallDone`. |
| `POST /` | `SubmitInstall` (bound to `forms.InstallForm`) | Validates and applies the submitted configuration; see below. |
| `GET /post-install` | `InstallDone` | The "you're all set" page; checks `user_model.HasUsers` to report whether an account already exists. |
| `GET /-/web-theme/list`, `POST /-/web-theme/apply` | `misc.WebThemeList`/`WebThemeApply` | Same theme-switcher endpoints used by the normal web UI, so the install page itself can be themed. |
| `GET /api/healthz` | `healthcheck.Check` | Same handler as the normal deployment's health check — see [Events & Healthcheck](events-and-healthcheck.md). Available even before installation so container orchestrators can probe liveness during first boot. |
| `GET /assets/*` | `public.FileHandlerFunc()` | Registered on the **outer** `base` router (not `r`), so static assets are served without going through the session/contexter middleware at all — they don't need a `*context.Context`. |
| (anything else) | `installNotFound` | Returns `404`, sets `Refresh: 1; url=<AppSubURL>/` so the browser auto-retries the root path once installation state changes, and explicitly avoids a `30x` redirect status because `fetch()` would silently follow it — the post-install detection logic on the frontend relies on distinguishing `404` from `200`. |

### `installContexter()` — the minimal context

Unlike the full `context.Contexter()` used by the normal web UI (see
[Middleware Chain](middleware-chain.md#3-context-construction-contextcontexter)),
install pages use `context.ContexterInstallPage(data map[string]any)`, which:

- Builds only `Base` + `NewWebContext(...)` (no session-derived doer, no auth group,
  no flash cookie, no multipart handling).
- Seeds template data with `DbTypeNames` (from `setting.SupportedDatabaseTypes`),
  `EnvConfigKeys` (env vars that override `app.ini`, shown so the admin knows which
  fields are locked), `CustomConfFile`, and `PasswordHashAlgorithms`.
- Sets `Title`, `PageIsInstall: true`, and `AllLangs` for the layout template.

There is deliberately no authentication middleware at all: nobody is signed in yet,
and the install page is only reachable pre-`InstallLock`, on a server the operator
presumably has exclusive access to during first boot.

### `SubmitInstall` validation flow

`SubmitInstall` (`routers/install/install.go`) performs, in order:

1. Re-checks `setting.InstallLock` (race-guard against submitting twice).
2. Normalizes `form.AppURL` to always end in `/`.
3. Re-renders the form with field-level errors if `ctx.HasError()` (binding
   validation failed).
4. Verifies the `git` binary is on `PATH` (`exec.LookPath("git")`).
5. Applies the submitted DB settings to `setting.Database.*` and calls
   `checkDatabase(ctx, &form)`, which attempts a real connection.
6. Calls `setting.PrepareAppDataPath()`, then creates (`os.MkdirAll`) the repository
   root path, LFS root path (if LFS isn't disabled), and log root path, reporting
   field-specific errors (`Err_RepoRootPath`, `Err_LFSRootPath`, `Err_LogRootPath`) on
   failure.
7. Rejects the "disable self-registration with no admin account" logical loophole.
8. If an admin account was requested, validates the username
   (`user_model.IsUsableUsername`, including reserved-name and pattern-not-allowed
   errors), a non-empty email, a non-empty password, and password confirmation match.
9. On success, persists the configuration, creates the admin user (or looks up an
   existing one with the same name if `SignUp` raced with another install attempt),
   mints an auth token (`auth_service.CreateAuthTokenForUserID`) and a "remember me"
   cookie, sets the session `uid`/`uname` for immediate auto-login, clears any
   env-config overrides that were only meant for install-time
   (`setting.ClearEnvConfigKeys()`), and calls `InstallDone(ctx)`.
10. **Self-shutdown**: after rendering the post-install page, it spawns a goroutine
    that sleeps 3 seconds (to let the browser finish loading the post-install page's
    own assets) and then calls `http.Server.Shutdown` on the *install* server
    instance (pulled from the request context via `http.ServerContextKey`). This is a
    plain `net/http` graceful shutdown, distinct from Gitea's own
    `graceful.Manager` hammer/shutdown machinery — after it completes, the top-level
    process loop (`runWeb()`, outside `routers/install`) proceeds to call
    `InitWebInstalled` and switches over to serving `routers.NormalRoutes()`.

## `routers/private` — the internal-only API

`routers/private` implements `/api/internal`, mounted from `routers/init.go`
alongside the normal web UI and REST API. It is architecturally distinct from both:
it authenticates with a shared secret (`setting.InternalToken`) rather than a user
session or personal access token, and it is only ever called by Gitea's own
sub-processes talking to `setting.LocalURL` — `gitea serv` (SSH command dispatch),
`gitea hook pre-receive`/`update`/`post-receive` (git server-side hooks),  and the
`gitea manager` CLI. It should never be reachable from the public internet in a
correctly configured deployment.

### Registration & authentication (`internal.go`)

```go
func Routes() *web.Router {
	r := web.NewRouter()
	r.AfterRouting(context.PrivateContexter())
	r.AfterRouting(authInternal)
	r.AfterRouting(setRealIP)

	r.Get("/dummy", misc.DummyOK)
	r.Post("/ssh/authorized_keys", AuthorizedPublicKeyByContent)
	r.Post("/ssh/{id}/update/{repoid}", UpdatePublicKeyInRepo)
	r.Post("/ssh/log", bind(private.SSHLogOption{}), SSHLog)
	r.Post("/hook/pre-receive/{owner}/{repo}", RepoAssignment, bind(private.HookOptions{}), HookPreReceive)
	r.Post("/hook/post-receive/{owner}/{repo}", context.OverrideContext(), bind(private.HookOptions{}), HookPostReceive)
	r.Post("/hook/proc-receive/{owner}/{repo}", context.OverrideContext(), RepoAssignment, bind(private.HookOptions{}), HookProcReceive)
	r.Post("/hook/set-default-branch/{owner}/{repo}/{branch}", RepoAssignment, SetDefaultBranch)
	r.Get("/serv/none/{keyid}", ServNoCommand)
	r.Get("/serv/command/{keyid}/{owner}/{repo}", ServCommand)
	r.Post("/manager/shutdown", Shutdown)
	r.Post("/manager/restart", Restart)
	r.Post("/manager/reload-templates", ReloadTemplates)
	r.Post("/manager/flush-queues", bind(private.FlushOptions{}), FlushQueues)
	r.Post("/manager/pause-logging", PauseLogging)
	r.Post("/manager/resume-logging", ResumeLogging)
	r.Post("/manager/release-and-reopen-logging", ReleaseReopenLogging)
	r.Post("/manager/set-log-sql", SetLogSQL)
	r.Post("/manager/add-logger", bind(private.LoggerOptions{}), AddLogger)
	r.Post("/manager/remove-logger/{logger}/{writer}", RemoveLogger)
	r.Get("/manager/processes", Processes)
	r.Post("/mail/send", SendEmail)
	r.Post("/restore_repo", RestoreRepo)
	r.Post("/actions/generate_actions_runner_token", GenerateActionsRunnerToken)

	r.Group("/repo", func() {
		// FIXME: not ideal to use context.Contexter for LFS handlers here (see AddOwnerRepoGitLFSRoutes below)
		common.AddOwnerRepoGitLFSRoutes(r, func(ctx *context.PrivateContext) {
			webContext := &context.Context{Base: ctx.Base}
			ctx.SetContextValue(context.WebContextKey, webContext)
		})
	})

	return r
}
```

`authInternal` is a plain `crypto/subtle.ConstantTimeCompare` check of the
`X-Gitea-Internal-Auth: Bearer <token>` header against `setting.InternalToken`
(constant-time to avoid timing side-channels), returning `403` on any mismatch or if
`INTERNAL_TOKEN` isn't configured at all. `setRealIP` trusts the `X-Real-IP` header
unconditionally (safe here specifically *because* the route is already gated by
`authInternal`) so hook/serv log lines show the originating client IP rather than
`127.0.0.1` (the loopback address `gitea serv`/hooks actually connect from).

### `context.PrivateContexter()` and `OverrideContext()`

Private routes use `*context.PrivateContext` (`services/context/private.go`), a much
smaller context than the web UI's — no session, no template renderer, no doer/auth
state — just `*Base` plus an optional `Repo *Repository`. Two hook endpoints
(`/hook/post-receive/...` and `/hook/proc-receive/...`) additionally apply
`context.OverrideContext()`, which swaps the context's `Done()`/`Deadline()`/`Err()`
to a `process.Manager`-tracked context derived from
`graceful.GetManager().HammerContext()` instead of the underlying HTTP request's
context. This matters because post-receive/proc-receive processing (pushing
notifications, syncing branches, creating pull requests via AGit) must be allowed to
finish even if the git client that triggered the push has already disconnected or the
HTTP request has timed out.

### Endpoint groups

| Group | Endpoints | Purpose |
|---|---|---|
| SSH key management | `/ssh/authorized_keys`, `/ssh/{id}/update/{repoid}`, `/ssh/log` | Called by `gitea admin` / key-management flows to rewrite `authorized_keys` entries and to log SSH connection details. |
| Git server hooks | `/hook/pre-receive`, `/hook/post-receive`, `/hook/proc-receive`, `/hook/set-default-branch` | Called by the `pre-receive`/`update`/`post-receive` git hook scripts Gitea installs into every repository's `.git/hooks`, and by `gitea hook` sub-commands. See [Web Router & Server-Rendered UI](web-routes.md#relationship-to-the-actions-runner-protocol) and [Git Integration](../10-git-integration/README.md) for how these interact with `serviceRPC()`. |
| `gitea serv` (SSH command dispatch) | `/serv/none/{keyid}`, `/serv/command/{keyid}/{owner}/{repo}` | Called by the `gitea serv` sub-command (invoked as the SSH `ForceCommand`) to resolve a deploy/user SSH key into a permission decision and the concrete git command to execute. |
| Process manager | `/manager/shutdown`, `/manager/restart`, `/manager/reload-templates`, `/manager/flush-queues`, `/manager/pause-logging`, `/manager/resume-logging`, `/manager/release-and-reopen-logging`, `/manager/set-log-sql`, `/manager/add-logger`, `/manager/remove-logger/{logger}/{writer}`, `/manager/processes` | Backs the `gitea manager` CLI sub-commands (used for zero-downtime restarts via the graceful manager, live log-level/queue introspection, and process listing). |
| Mail | `/mail/send` | Used by `gitea admin sendmail` and similar CLI-triggered mail sends that need to run inside the running server's mailer configuration rather than a short-lived CLI process. |
| Repo restore | `/restore_repo` | Backs `gitea admin repo restore`. |
| Actions | `/actions/generate_actions_runner_token` | Mints a new Actions runner *registration* token — deliberately kept on the privileged internal API since it's an instance-local admin operation, distinct from the runner's ongoing, always-public `/api/actions` protocol (see [Web Router & Server-Rendered UI](web-routes.md#relationship-to-the-actions-runner-protocol)). |
| Git LFS (SSH path) | `/repo/{owner}/{repo}/info/lfs/...` via `common.AddOwnerRepoGitLFSRoutes` | Lets SSH-initiated LFS transfers (`gitea serv` issuing an LFS transfer URL) reuse the same LFS batch/transfer handlers as the public web-mounted LFS routes, by constructing a minimal `*context.Context` wrapper around the `*context.PrivateContext`'s `Base`. |

`hook_pre_receive.go`'s `preReceiveContext` caches permission state
(`userPerm`, `deployKeyAccessMode`, `canWriteCodeUnit`, `canCreatePullRequest`,
`protectedTags`) across the many individual ref checks performed during a single
push, avoiding repeated DB round-trips; `assertCanWriteRef` is the shared guard that
turns a failed check into a `403` with a `UserMsg` git clients display verbatim.
`hook_post_receive.go` turns raw `HookOptions.OldCommitIDs`/`NewCommitIDs`/
`RefFullNames` into `repo_module.PushUpdateOptions` (branches/tags only — other refs
like `refs/notes` are ignored to bound DB writes), driving branch-sync updates,
`pull_service` triggers, and push notifications. `hook_proc_receive.go` implements the
**AGit** flow (`refs/for/<branch>[/<topic>]` pushes turned into pull requests without
ever creating the literal ref), delegating to `services/agit`.

## Where to go next

| If you want to... | Go to |
|---|---|
| See the full route-group tree, including where these routers mount | [Route Organization](route-organization.md) |
| See session/CSRF/auth-context wiring for the *normal* web UI | [Middleware Chain](middleware-chain.md) |
| See `/api/healthz` and `/user/events` in detail | [Events & Healthcheck](events-and-healthcheck.md) |
| See the git operations/hooks these internal routes support | [Git Integration](../10-git-integration/README.md) |
| See the Actions runner protocol | [Services](../08-services/README.md) |
