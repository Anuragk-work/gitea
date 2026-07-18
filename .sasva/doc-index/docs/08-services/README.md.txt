=== FILE: docs/08-services/README.md ===
=== METADATA: format=md ===
[SUMMARY] # Services An overview of the business logic layer implemented in Gitea's services package. `services/` sits between the HTTP routers and the `models`/`modules` layers. It contains the orchestration logic that routers call into: creating a repository (which touches the DB, the filesystem, and the Git module in one transaction), authenticating a user against one of several pluggable auth sources, sending notifications, running Actions jobs, and more.

# Services

An overview of the business logic layer implemented in Gitea's services package.

`services/` sits between the HTTP routers and the `models`/`modules` layers.
It contains the orchestration logic that routers call into: creating a
repository (which touches the DB, the filesystem, and the Git module in one
transaction), authenticating a user against one of several pluggable auth
sources, sending notifications, running Actions jobs, and more. Per the
[Module Dependency Map](../02-architecture/module-dependency-map.md), services
may depend on models and modules, but never the other way around.

## Section Contents

| Page | Description |
|---|---|
| [Authentication & Authorization](auth-providers.md) | Auth sources (local, LDAP, OAuth2, SMTP, SSPI), session/token handling, and permission resolution |
| [Services Catalog](services-catalog.md) | Narrative deep-dive into the business-logic packages under `services/`, what each owns, and their key entry points |
| [Services Catalog (Full)](services-catalog-full.md) | Flat, complete inventory of all 40 `services/*` subpackages — one row each, grouped into nine functional clusters with a Mermaid overview diagram |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the models services operate on | [Database & Models](../05-database-models/README.md) |
| See the modules services call into | [Core Modules](../09-core-modules/README.md) |
| See how services are invoked from HTTP handlers | [Web Router & Server-Rendered UI](../06-web-routers/web-routes.md) |
