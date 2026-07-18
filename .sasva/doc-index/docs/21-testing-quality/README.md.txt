=== FILE: docs/21-testing-quality/README.md ===
=== METADATA: format=md ===
[SUMMARY] # Testing & Quality Covers Gitea's testing strategy, test suites, and quality assurance tooling. Gitea validates correctness through four layers of automated tests plus continuous fuzzing: - **Backend unit tests** — Go `*_test.go` files colocated with source, run with `make test-backend`. - **Integration tests** — `tests/integration/` (251+ files), exercising real HTTP routes against a real SQL database (SQLite/MySQL/PostgreSQL/MSSQL), run with `make test-integration`.

# Testing & Quality

Covers Gitea's testing strategy, test suites, and quality assurance tooling.

Gitea validates correctness through four layers of automated tests plus continuous fuzzing:

- **Backend unit tests** — Go `*_test.go` files colocated with source, run with `make test-backend`.
- **Integration tests** — `tests/integration/` (251+ files), exercising real HTTP routes against a real SQL database (SQLite/MySQL/PostgreSQL/MSSQL), run with `make test-integration`.
- **End-to-end tests** — Playwright specs in `tests/e2e/` that drive a real browser against a real compiled Gitea binary, run with `make test-e2e`.
- **Fuzz tests** — Go native fuzz targets in `tests/fuzz/` continuously stress-testing the Markdown/markup parsers.
- **Frontend unit tests** — Vitest specs colocated in `web_src/js/**/*.test.ts`, run with `make test-frontend`.

See [Unit, Integration, E2E & Fuzz Testing](unit-integration-e2e-fuzz.md) for full details on each layer, how to run individual tests, database selection via `GITEA_TEST_DATABASE`, and how test fixtures are organized.
