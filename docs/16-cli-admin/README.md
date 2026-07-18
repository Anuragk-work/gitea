# CLI & Admin Operations

Reference documentation for Gitea's command-line administration tooling.

Gitea ships as a single static binary that acts both as the web application
and as the command-line administration tool, built on `urfave/cli` in
`cmd/`. Every operational task — starting the web server, running database
migrations, managing users, backing up data, regenerating SSH keys, or
invoking internal Git hooks — is implemented as a CLI subcommand.

## Section Contents

| Page | Description |
|---|---|
| [CLI & Admin Operations](cli-commands.md) | Full subcommand reference: `web`, `admin`, `dump`, `migrate`, `doctor`, `hook`, `serv`, `actions`, and more, with flags and usage examples |
| [CLI Command Reference Index](cli-command-reference-index.md) | Condensed, alphabetically sorted lookup table of every `gitea` CLI subcommand, its source file, and its constructor function — cross-checked against `cmd/*.go` |
| [Running Gitea as a System Service](service-management.md) | systemd, SysV init, OpenRC, OpenWrt, FreeBSD/OpenBSD `rc.d`, Solaris SMF, macOS `launchd`, and Supervisor service definitions (`contrib/service/*`), and how each maps onto Gitea's own graceful restart/shutdown model |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the `app.ini` settings the CLI reads | [Settings Catalog](../04-configuration/settings-catalog.md) |
| See day-to-day administration guidance | [Admin Guide](../18-admin-guide/README.md) |
| See how internal Git hooks integrate with the `hook` subcommand | [Git LFS & Server-Side Hooks](../09-core-modules/lfs-and-hooks.md) |
