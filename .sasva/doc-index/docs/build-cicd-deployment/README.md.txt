=== FILE: docs/build-cicd-deployment/README.md ===
=== METADATA: format=md ===
[SUMMARY] # Build, CI/CD & Deployment This section documents how the Gitea *project itself* is built, tested by continuous integration, packaged, and containerized — as distinct from section [22 · Contributing & Development](../22-contributing-development/README.md), which covers the human contribution workflow, and [03 · Getting Started](../03-getting-started/README.md), which covers building Gitea as an end user.

# Build, CI/CD & Deployment

This section documents how the Gitea *project itself* is built, tested by
continuous integration, packaged, and containerized — as distinct from
section [22 · Contributing & Development](../22-contributing-development/README.md),
which covers the human contribution workflow, and
[03 · Getting Started](../03-getting-started/README.md), which covers building
Gitea as an end user.

## Section Contents

| Page | Description |
|---|---|
| [Makefile & Build System](makefile-and-build.md) | The root `Makefile` targets, build tags, cross-compilation, and asset generation (`make generate`, `make build`) |
| [Docker & Packaging](docker-and-packaging.md) | The official `Dockerfile`(s), multi-stage builds, `docker-compose` examples, and OS packages |
| [GitHub Workflows & Actions](github-workflows.md) | The `.github/workflows/*.yml` pipelines that lint, test, build, and release Gitea on every push/PR |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| Build Gitea from source as an end user | [Installation and Build](../03-getting-started/installation-and-build.md) |
| Understand the release process/versioning | [Contribution Workflow & Governance](../22-contributing-development/contribution-workflow.md) |
| Run Gitea's own test suites | [Unit, Integration, E2E & Fuzz Testing](../21-testing-quality/unit-integration-e2e-fuzz.md) |
