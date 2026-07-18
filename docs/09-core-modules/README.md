# Core Modules

Documentation of Gitea's shared internal modules used across the codebase.

## Pages

- [Modules Catalog (Full)](modules-catalog-full.md) — table + diagram of all 85 `modules/*` packages grouped by responsibility
- [Git Module](git-module.md) — the dual gogit/nogogit backend, catfile-batch protocol, diff/grep, version-gated features (see also [10 · Git Integration](../10-git-integration/README.md) for the `gitrepo` layer and the end-to-end push/hook sequence diagram)
- [Search & Indexing](indexers.md) — code, issue/PR, and repo-language-statistics indexers (Bleve, Elasticsearch, Meilisearch, DB, git-grep fallback)
- [Git LFS & Server-Side Hooks](lfs-and-hooks.md) — LFS pointer files/content store, HTTP Batch API, SSH `git-lfs-transfer`, pre/post-receive hooks
- [Markup Rendering Engines](markup-engines.md) — pluggable markup renderers, sanitization, syntax highlighting, emoji, and charset detection
- [Storage, Queue & Caching](storage-queue-cache.md) — object storage backends, async job queues, caching, and distributed locks
- [Notifications, Mailer & Webhooks](notify-mailer-webhook.md) — the `notify.Notifier` fan-out pattern, outgoing webhooks, mailer, and SSE
- [Frontend Build Pipeline](frontend-build.md) — Vite/esbuild/pnpm build tooling for `web_src/`
- [Frontend Features](frontend-features.md) — notable client-side feature implementations
