=== FILE: docs/02-architecture/README.md ===
=== METADATA: format=md ===
[SUMMARY] # Architecture A high-level look at Gitea's system architecture, components, and how they interact. Gitea runs as a single Go binary that hosts an HTTP router (web UI + REST API), an optional built-in SSH server, a business-logic ("services") layer, an ORM layer over SQLite/MySQL/PostgreSQL/MSSQL, and a set of dependency-free shared modules (Git, markup rendering, storage, queue, cache, search indexing).

# Architecture

A high-level look at Gitea's system architecture, components, and how they interact.

Gitea runs as a single Go binary that hosts an HTTP router (web UI + REST API),
an optional built-in SSH server, a business-logic ("services") layer, an ORM
layer over SQLite/MySQL/PostgreSQL/MSSQL, and a set of dependency-free shared
modules (Git, markup rendering, storage, queue, cache, search indexing). This
section covers the request lifecycle, the module dependency rules that keep
the codebase from becoming a tangle of circular imports, and the topologies
used to deploy Gitea in production.

## Section Contents

| Page | Description |
|---|---|
| [System Architecture](system-architecture.md) | Component diagram, layering (routers → services → models/modules), and how the pieces fit together |
| [Request Lifecycle](request-lifecycle.md) | Step-by-step trace of an HTTP request from Chi routing through middleware, context setup, and handler dispatch |
| [Module Dependency Map](module-dependency-map.md) | The `modules/` → `models/` → `services/` → `routers/` layering rule, naming conventions, and how to verify it with grep |
| [Deployment Topologies](deployment-topologies.md) | Single-node, HA/clustered, and containerized deployment patterns, including storage and database considerations |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the database schema | [Database & Models](../05-database-models/README.md) |
| See how HTTP routes are wired up | [Web Routers](../06-web-routers/README.md) |
| See the shared internal modules referenced by the dependency map | [Core Modules](../09-core-modules/README.md) |
