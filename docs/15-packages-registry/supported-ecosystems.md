# Supported Package Ecosystems

Gitea ships a built-in package registry that emulates the native protocols of the most
popular package managers. Every user, organization, or repository can host packages of
any of the supported types side-by-side, without running a separate registry server.

All ecosystem implementations share the same underlying models (`models/packages`) and
storage layer (`modules/packages`), but each one speaks the wire protocol that its native
client (`npm`, `cargo`, `docker`, `dpkg`, `pip`, ...) already expects. This page is the
canonical reference of the **22 supported formats**, the protocol each one implements, and
where its type-specific code lives.

> The full list of registered types is defined in [`models/packages/package.go`](../../models/packages/package.go)
> as the `Type` enum and `TypeList` slice.

## Ecosystem Reference Table

| # | Ecosystem | `packages_model.Type` | Protocol / Client Compatibility | Router | Module (metadata/validation) |
|---|-----------|------------------------|----------------------------------|--------|-------------------------------|
| 1 | Alpine | `alpine` | Alpine `apk`/`abuild` repository layout (`APKINDEX.tar.gz`, signed with repo key) | `routers/api/packages/alpine` | `modules/packages/alpine` |
| 2 | Arch Linux | `arch` | Arch `pacman` repository (`repo-add` style DB + signed packages) | `routers/api/packages/arch` | `modules/packages/arch` |
| 3 | Cargo | `cargo` | Rust Cargo **sparse index** protocol + crates.io-compatible API (`/api/v1/crates`) | `routers/api/packages/cargo` | `modules/packages/cargo` |
| 4 | Chef | `chef` | Chef Supermarket API (`/api/v1/cookbooks`, universe/search) | `routers/api/packages/chef` | `modules/packages/chef` |
| 5 | Composer | `composer` | Composer/Packagist `packages.json` + `p2` metadata format | `routers/api/packages/composer` | `modules/packages/composer` |
| 6 | Conan | `conan` | Conan v1 and v2 REST API (recipes, package references, revisions) | `routers/api/packages/conan` | `modules/packages/conan` |
| 7 | Conda | `conda` | Conda channel layout (`<channel>/<arch>/<file>`, `repodata.json`) | `routers/api/packages/conda` | `modules/packages/conda` |
| 8 | Container (OCI) | `container` | Docker Registry HTTP API v2 / OCI Distribution Spec (`/v2/...`) | `routers/api/packages/container` | `modules/packages/container` |
| 9 | CRAN | `cran` | CRAN source/binary repository (`PACKAGES`, `src/contrib`, `bin/<platform>`) | `routers/api/packages/cran` | `modules/packages/cran` |
| 10 | Debian | `debian` | Debian APT repository (`dists/`, `pool/`, `Packages`/`Release`, by-hash) | `routers/api/packages/debian` | `modules/packages/debian` |
| 11 | Generic | `generic` | Gitea's own simple file-storage format, not tied to any external client | `routers/api/packages/generic` | *(no dedicated module — uses shared infra directly)* |
| 12 | Go / goproxy | `go` | Go Modules proxy protocol (`GOPROXY`, `@v/list`, `.zip`, `.info`, `.mod`) | `routers/api/packages/goproxy` | `modules/packages/goproxy` |
| 13 | Helm | `helm` | Helm chart repository (`index.yaml` + `helm push` plugin API) | `routers/api/packages/helm` | `modules/packages/helm` |
| 14 | Maven | `maven` | Maven2 repository layout (`GroupId/ArtifactId/Version/*.jar/.pom`) | `routers/api/packages/maven` | `modules/packages/maven` |
| 15 | npm | `npm` | npm registry API (`GET /{package}`, tarball `PUT`, dist-tags, search) | `routers/api/packages/npm` | `modules/packages/npm` |
| 16 | NuGet | `nuget` | NuGet **v2 (OData)** and **v3** APIs (`index.json`, registration, symbols) | `routers/api/packages/nuget` | `modules/packages/nuget` |
| 17 | Pub | `pub` | Dart/Flutter `pub` hosted-package API (upload/finalize/versions) | `routers/api/packages/pub` | `modules/packages/pub` |
| 18 | PyPI | `pypi` | PyPI **legacy upload** + **Simple Index API** (`/simple/{project}/`) | `routers/api/packages/pypi` | `modules/packages/pypi` |
| 19 | RPM | `rpm` | RPM/yum repository (`repodata/`, `.repo` config, GPG repo key) | `routers/api/packages/rpm` | `modules/packages/rpm` |
| 20 | RubyGems | `rubygems` | RubyGems API (`specs.4.8.gz`, `gems/`, `api/v1/gems`) | `routers/api/packages/rubygems` | `modules/packages/rubygems` |
| 21 | Swift | `swift` | Swift Package Registry (SE-0292, content negotiation via `Accept`) | `routers/api/packages/swift` | `modules/packages/swift` |
| 22 | Terraform (state) | `terraform` | Terraform HTTP state backend (state CRUD + locking) | `routers/api/packages/terraform` | `modules/packages/terraform` |
| — | Vagrant | `vagrant` | Vagrant Cloud box API (`/authenticate`, box metadata, provider upload) | `routers/api/packages/vagrant` | `modules/packages/vagrant` |

> The table above lists 23 rows because `Generic` is a Gitea-specific catch-all type without a
> native external protocol, in addition to the 22 protocol-emulating ecosystems tracked in
> `TypeList`. If you only count "external ecosystem" implementations that mimic a real package
> manager protocol, that is exactly 22 (all rows except Generic).

Each `Type` also has a human-readable `Name()` and an icon name (`SVGName()`) used by the
web UI, both defined next to the `Type` constants in `models/packages/package.go`.

## Where Ecosystem Code Lives

Every ecosystem is implemented across up to four layers, mirroring the general
[Services](../08-services/README.md) / [Web Routers](../06-web-routers/README.md) /
[Database Models](../05-database-models/README.md) split used elsewhere in Gitea:

| Layer | Path pattern | Responsibility |
|-------|--------------|-----------------|
| Router | `routers/api/packages/<type>` | HTTP route handlers; parses ecosystem-specific request format, calls services |
| Service | `services/packages/<type>` (only for the more complex types: `alpine`, `arch`, `cargo`, `container`, `debian`, `rpm`, `terraform`) | Higher-level orchestration, index regeneration, signing |
| Module | `modules/packages/<type>` | Pure functions: parse package archive, extract metadata, validate format — no DB/HTTP dependency |
| Model | `models/packages/<type>` (only for `alpine`, `arch`, `conan`, `conda`, `container`, `cran`, `debian`, `nuget`, `rpm`) | Ecosystem-specific queries/joins on top of the shared `Package*` tables |

Simple ecosystems (npm, PyPI, Maven, generic, etc.) don't need a dedicated
`services/packages/<type>` or `models/packages/<type>` package — they use the shared helpers
in `services/packages/packages.go` directly (see
[Shared Infrastructure](shared-infrastructure.md)).

## Authentication

All package endpoints (mounted at `/api/packages/{owner}/...`) accept the same authentication
methods used elsewhere in the API — Basic Auth, OAuth2 tokens, and personal access tokens with
`read:package` / `write:package` scopes — enforced via `reqPackageAccess()` in
[`routers/api/packages/api.go`](../../routers/api/packages/api.go). A few ecosystems bring
their own auth quirks:

- **NuGet** has an additional `nuget.Auth{}` method registered because some NuGet clients send
  credentials in a nonstandard way.
- **Chef** signs every request with an RSA keypair, handled by `chef.Auth{}`.
- **Container (OCI)** uses a token-exchange flow (`/v2/token`) compatible with the Docker
  Registry spec and allows anonymous ("ghost user") pulls for public images.

See [Authentication](../11-authentication/README.md) for the general auth subsystem.

> For the exact HTTP paths/verbs mounted for each ecosystem (e.g. `PUT /npm/{package}`,
> `GET /v2/{name}/manifests/{reference}`), see the ecosystem route reference table in
> [Packages & Actions API](../07-rest-api/packages-and-actions-api.md#ecosystem-route-reference)
> rather than this page — this table intentionally stays at the protocol/client-compatibility
> level so it doesn't drift out of sync with the router code.

## Related Pages

- [Protocol Adapters](protocol-adapters.md) — how each of the protocols listed above is
  implemented on top of the shared services/models, including the ecosystems (Alpine, Arch,
  Debian, RPM, Cargo, Container) that need more than a simple upload/download handler.
- [Package Upload/Download Flow](package-flow.md)
- [Shared Infrastructure](shared-infrastructure.md)
- [Database Schema](database-schema.md)
- [Packages & Actions API](../07-rest-api/packages-and-actions-api.md) — the full HTTP route
  reference for every ecosystem's endpoints.
