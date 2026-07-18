# Admin Guide

Guidance for administrators on managing and maintaining a Gitea instance,
covering the web-based `/-/admin` panel, the `dump`/`doctor` CLI
maintenance commands, and the metrics/profiling surfaces used to observe
a running instance.

## Section Contents

| Page | Description |
|---|---|
| [Admin Panel & Operations](admin-panel-and-operations.md) | The `/-/admin` web UI (`routers/web/admin`): dashboard, self-check, user/org/repo/package administration, auth sources, system webhooks, notices, and the monitor sub-panel (cron, queues, stacktraces, diagnosis ZIP) |
| [Backup, Restore & Doctor](backup-restore-and-doctor.md) | `gitea dump`/restore procedures and the `gitea doctor check`/`recreate-table`/`convert` diagnostic and repair subcommands, including the full check catalog |
| [Monitoring & Observability](monitoring-and-observability.md) | The `/metrics` Prometheus endpoint, `pprof` profiling paths, and the Grafana monitoring mixin, plus how they relate to the CLI and `/-/admin` UI |
| [CLI & Admin Operations](../16-cli-admin/cli-commands.md) | Full subcommand reference for administering a Gitea instance |
| [Settings Catalog](../04-configuration/settings-catalog.md) | `app.ini` reference for tuning a running instance |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| Install/run Gitea for the first time | [Getting Started](../03-getting-started/README.md) |
| Understand deployment options (single-node vs HA) | [Deployment Topologies](../02-architecture/deployment-topologies.md) |
| Manage package registry storage/cleanup | [Packages & Registry](../15-packages-registry/README.md) |
