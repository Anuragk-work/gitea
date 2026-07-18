# REST API

Reference documentation for Gitea's public REST API endpoints.

Gitea exposes a comprehensive JSON REST API under `/api/v1`, implemented in
`routers/api/v1` and documented with Swagger annotations that generate the
interactive API docs served at `/api/swagger`. The API mirrors most web UI
capabilities — repositories, issues, pull requests, users, organizations,
packages, Actions — and is the primary integration point for external tools,
CI systems, and the `tea` CLI.

## Section Contents

| Page | Description |
|---|---|
| [REST API v1 Overview](api-v1-overview.md) | Route groups, authentication methods, and how endpoints map to `routers/api/v1` |
| [API Conventions & Swagger](api-conventions-and-swagger.md) | Response envelopes, pagination, error format, versioning, and how the Swagger spec is generated |
| [Packages & Actions API](packages-and-actions-api.md) | The ecosystem-specific package-registry protocol endpoints (`/api/packages/*`, `/v2`) and the Actions runner/artifact machine-to-machine API (`/api/actions/*`), both mounted outside the versioned `/api/v1` tree |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the package registry's own protocol endpoints | [Packages & Registry](../15-packages-registry/README.md) |
| See the server-rendered web routes instead | [Web Routers](../06-web-routers/README.md) |
| See how API requests are authenticated | [Authentication & Authorization](../08-services/auth-providers.md) |
