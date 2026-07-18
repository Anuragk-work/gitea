# Packages & Registry

Documentation of Gitea's built-in package registry supporting multiple ecosystems.

Gitea includes a first-class package registry capable of emulating the native protocols of
22 different package ecosystems — from npm and Maven to Docker/OCI containers, Debian/RPM
Linux repositories, and Terraform remote state. Every ecosystem shares the same underlying
storage and database infrastructure, which is what keeps the system maintainable despite its
breadth.

> For the full HTTP route reference (paths, verbs, mounting, and authentication middleware for
> `/api/packages` and `/v2`), see [Packages & Actions API](../07-rest-api/packages-and-actions-api.md)
> in the REST API section. This section focuses on the underlying models, storage, and
> protocol-adapter implementation rather than duplicating the endpoint list.

## Pages in this Section

- [Supported Ecosystems](supported-ecosystems.md) — the full reference table of all 22
  supported package formats, their protocol, and where their code lives.
- [Protocol Adapters](protocol-adapters.md) — how each ecosystem's native wire protocol is
  translated into calls against the shared services/models, including the index-rebuilding
  ecosystems (Alpine, Arch, Debian, RPM, Cargo) and the OCI container registry's manifest-graph
  and chunked-upload handling.
- [Package Upload/Download Flow](package-flow.md) — how a file moves from client to storage
  and back, with sequence and architecture diagrams.
- [Shared Infrastructure](shared-infrastructure.md) — content-addressable storage, multi-hash
  verification, hashed buffers, and bounded file lists used by every ecosystem.
- [Database Schema](database-schema.md) — the `Package` / `PackageVersion` / `PackageFile` /
  `PackageBlob` / `PackageProperty` tables and how they relate.

## Quick Orientation

| If you want to... | Start here |
|---|---|
| See what package managers Gitea supports | [Supported Ecosystems](supported-ecosystems.md) |
| Look up the exact HTTP routes/verbs for an ecosystem | [Packages & Actions API](../07-rest-api/packages-and-actions-api.md) |
| Understand how a specific ecosystem's protocol maps to Gitea's shared services | [Protocol Adapters](protocol-adapters.md) |
| Understand how an upload becomes bytes on disk | [Package Upload/Download Flow](package-flow.md) |
| Add deduplication-aware storage to a new feature | [Shared Infrastructure](shared-infrastructure.md) |
| Write a DB query against packages | [Database Schema](database-schema.md) |
| Add a brand-new package ecosystem | `routers/api/packages/README.md` in the source tree, then the pages above |
