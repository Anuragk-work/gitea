# Repository Management

Covers repository creation, settings, branches, and related management features: the full
repository lifecycle (create, fork, adopt, migrate, mirror, transfer, archive, delete), plus the
three repository-attached features that layer on top of it — releases, wiki, and projects.

The `Repository` entity and its satellite models (forks, mirrors, releases, topics, stars/watches,
wiki, per-repository "unit" feature toggles) are documented in full under **05 · Database &
Models**, since the *data model* is primarily a data-modeling concern; this section instead
documents the *service-orchestration* layer — `services/repository`, `services/mirror`,
`services/release`, `services/wiki`, and `services/projects` — that implements the actual
behavior on top of that model.

## Section Contents

| Page | Description |
|---|---|
| [Repository Lifecycle](repository-lifecycle.md) | Create, fork, adopt, generate-from-template, migrate, pull/push mirroring, transfer ownership, archive/unarchive, and delete — with a state diagram of every transition |
| [Releases, Wiki & Projects](releases-wiki-projects.md) | Release/tag creation and protection, release-notes generation, wiki page read/write mechanics (a second bare git repo per project), and the Kanban-style Projects board |
| [Repository Model](../05-database-models/repository-model.md) | The `Repository` entity, forks, mirrors, releases, topics, stars/watches, wiki, and repo units |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the web routes for repository pages/settings | [Web Router & Server-Rendered UI](../06-web-routers/web-routes.md) |
| See the REST API for repositories | [REST API v1 Overview](../07-rest-api/api-v1-overview.md) |
| See how Git operations on a repo are performed | [Git Module](../09-core-modules/git-module.md) |
| See the full services-layer catalog (all 40 `services/` subpackages) | [Services Catalog (Full)](../08-services/services-catalog-full.md) |
