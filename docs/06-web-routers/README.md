# Web Routers

An explanation of Gitea's HTTP routing layer and web request handling.

The server-rendered web UI (as opposed to the JSON REST API) is wired up in
`routers/web`, using the [Chi](https://github.com/go-chi/chi) router along
with Gitea's own middleware chain for session handling, CSRF/cross-origin
protection, context injection, and permission checks. Handlers render Go `html/template`
views backed by data assembled from the services and models layers. This section also
covers the pre-install wizard (`routers/install`) and the internal-only API
(`routers/private`) used by Git hooks and Gitea's own sub-commands.

## Section Contents

| Page | Description |
|---|---|
| [Route Organization](route-organization.md) | Top-level router composition (`routers/init.go`), the full route-group tree from `/` down through repo/org/user/admin/internal routes, and how `chi` groups are repeated with different middleware |
| [Middleware Chain](middleware-chain.md) | Ordered walk through every middleware a web request passes through: protocol-level handlers, session init, `context.Contexter`, the `AuthMiddleware` auth-provider group, and per-route CSRF/cross-origin & sign-in enforcement |
| [Web Router & Server-Rendered UI](web-routes.md) | Route registration structure in `routers/web`, per-route middleware/handler tables, Git Smart/Dumb HTTP, `go get` vanity imports, federation (WebFinger/NodeInfo/ActivityPub), and the internal API's relationship to git hooks |
| [Install & Private Routers](install-and-private.md) | The pre-`InstallLock` installation wizard (`routers/install`) and the `INTERNAL_TOKEN`-gated internal API (`routers/private`) used by `gitea serv`, git hooks, and the `gitea manager` CLI |
| [Events & Healthcheck](events-and-healthcheck.md) | The `/user/events` Server-Sent-Events stream for live notification/logout pushes, and the `/api/healthz` JSON health-check endpoint |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the JSON API instead | [REST API](../07-rest-api/README.md) |
| See how a request is dispatched end-to-end | [Request Lifecycle](../02-architecture/request-lifecycle.md) |
| See the templates rendered by web handlers | [Go Templates & Views](../20-frontend-ui/go-templates.md) |
| See the git operations/hooks the internal API supports | [Git Integration](../10-git-integration/README.md) |
