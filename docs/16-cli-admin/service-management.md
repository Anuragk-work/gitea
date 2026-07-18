# Running Gitea as a System Service

Gitea itself has no daemonization logic — `gitea web` runs in the foreground,
logs to stdout/stderr (or files, per `app.ini`), and relies on the OS's
process supervisor for start-on-boot, automatic restart on crash, and clean
shutdown signal delivery. The upstream repository ships ready-to-adapt unit
files/init scripts for every major init system under
[`contrib/service/`](../../contrib/service), covering Linux (systemd,
legacy SysV init, OpenRC/Gentoo), the BSDs (FreeBSD `rc.d`, OpenBSD `rc.d`),
OpenWrt (`procd`), Solaris/illumos (SMF), macOS (`launchd`), and the
process-manager-agnostic **Supervisor** as a fallback for any platform.

All of these scripts converge on the same invocation as their actual
workload:

```sh
gitea web --config /etc/gitea/app.ini
```

run as a dedicated, unprivileged `git` OS user, with the working directory
set to Gitea's data directory (`GITEA_WORK_DIR`) so that relative paths in
`app.ini` (repositories, LFS objects, logs, etc.) resolve correctly. See
[Getting Started — Running Gitea](../03-getting-started/running-gitea.md) for
the underlying `web` command flags and
[Configuration (`app.ini`)](../03-getting-started/configuration-app-ini.md)
for `WORK_PATH`/`GITEA_WORK_DIR` semantics.

## Common Conventions Across All Service Files

| Convention | Typical value | Purpose |
|---|---|---|
| Run-as user/group | `git`/`git` | Unprivileged account that owns repositories and the Gitea binary's data |
| Binary path | `/usr/local/bin/gitea` (or `/opt/local/bin/gitea` on Solaris) | Installed release binary |
| Config file | `/etc/gitea/app.ini` | Passed via `-c`/`--config` (or `GITEA_CUSTOM`) |
| Working directory | `/var/lib/gitea` | `GITEA_WORK_DIR` — base for relative paths |
| `HOME` env var | `/home/git` | Needed because git itself (and SSH key lookups) consult `$HOME` |
| Restart policy | "always"/"automatic" | The service manager restarts Gitea if it crashes |

Every script sets **`GITEA_WORK_DIR`** (and usually `USER`/`HOME`) as
environment variables rather than relying on `gitea`'s `--work-path` flag —
this mirrors how `cmd/main.go`'s `prepareWorkPathAndCustomConf` resolves the
work path from flags, environment variables, or discovery, in that priority
order (see [CLI & Admin Operations](cli-commands.md#entry-point--app-assembly)).
Because none of these scripts pass `--work-path` explicitly, the environment
variable is what ultimately determines `setting.AppWorkPath` at process
start.

> Regardless of init system, `gitea` should **never** be run directly as
> `root` in production — do a privileged one-time `chown -R git:git` of the
> data directories, and let the unprivileged `git` account own the running
> process. The only common exception is binding to a port below 1024
> (`80`/`443`), for which several scripts show a commented-out
> `setcap cap_net_bind_service=+ep` line rather than suggesting running as
> root.

## systemd (`contrib/service/systemd/gitea.service`)

The most common production deployment target on modern Linux distributions
(Debian, Ubuntu, RHEL/Fedora, Arch, etc.).

```ini
[Unit]
Description=Gitea (Git with a cup of tea)
After=network.target

[Service]
RestartSec=2s
Type=simple
User=git
Group=git
WorkingDirectory=/var/lib/gitea/
ExecStart=/usr/local/bin/gitea web --config /etc/gitea/app.ini
Restart=always
Environment=USER=git HOME=/home/git GITEA_WORK_DIR=/var/lib/gitea

[Install]
WantedBy=multi-user.target
```

Notable commented-out extension points in the shipped unit file:

- **Database ordering** — `Wants=`/`After=` blocks for `mysql.service`,
  `mariadb.service`, `postgresql.service`, `memcached.service`, and
  `redis.service`, so systemd starts the DB/cache before Gitea when they run
  on the same host.
- **Socket activation** — an `After=gitea.main.socket` /
  `Requires=gitea.main.socket` pairing plus an example companion
  `gitea.main.socket` unit (`ListenStream=<port>`), letting systemd own the
  listening socket and hand it to Gitea on first connection (reduces
  systemd-startup-order races and permits binding to privileged ports without
  capabilities).
- **`LimitNOFILE=524288:524288`** — raises the open-file-descriptor limit for
  repositories with very large numbers of files (avoids spurious HTTP 500s).
- **`RuntimeDirectory=gitea`** — when using a Unix socket for the HTTP
  listener, this tells systemd to create `/run/gitea` (which persists across
  reboots, unlike a manually created directory).
- **Non-default git PATH** — `Environment=PATH=/path/to/git/bin:...`, needed
  when a side-installed Git version (with `git-lfs` alongside it) should take
  precedence over the distro's Git.
- **Binding to privileged ports** — `CapabilityBoundingSet=CAP_NET_BIND_SERVICE`
  + `AmbientCapabilities=CAP_NET_BIND_SERVICE` grant the capability without
  running as root; `PrivateUsers=false` is documented as a companion setting
  when capabilities need to reach the Gitea process despite the unit's
  sandboxing.

### systemd lifecycle mapping

| systemctl action | Effect on Gitea |
|---|---|
| `systemctl start gitea` | Runs `ExecStart`; `Type=simple` means systemd considers the unit "started" as soon as the process forks (no separate PID-file handshake needed) |
| `systemctl stop gitea` | Sends `SIGTERM` (systemd default) — Gitea's `installSignals()`/`graceful.Manager` treats this as `DoGracefulShutdown()` (see [Graceful Restart & Shutdown](cli-commands.md#graceful-restart--shutdown)) |
| `systemctl restart gitea` | Stop then start — a **new PID**, not the in-process `SIGHUP` hot-restart; since `setting.GracefulRestartable` is not relevant here, this is simply "stop, then start fresh" |
| `systemctl reload gitea` | Not wired up by the shipped unit (no `ExecReload=`); use `gitea manager` subcommands (below) instead for in-process operations |
| `RestartSec=2s` / `Restart=always` | If the process exits (crash or otherwise), systemd waits 2s and restarts it unconditionally |

Because `RestartSec`/`Restart=always` already gives systemd ownership of
process supervision, deployments that let systemd manage restarts should
generally **turn off** Gitea's own `SIGHUP`-based fork-and-hand-off by
setting `[server] ALLOW_GRACEFUL_RESTARTS = false` in `app.ini` (the setting
defaults to `true`, i.e. `SIGHUP`-triggered forking is enabled unless
explicitly disabled) — sending `SIGHUP` to a process that then forks a
*second*, systemd-untracked process would confuse systemd's cgroup/PID
tracking for the unit. When `ALLOW_GRACEFUL_RESTARTS` is `false`,
`graceful.Manager.DoGracefulRestart()` skips forking entirely and simply
performs a normal `doShutdown()` — systemd's `Restart=always` then starts a
fresh, properly tracked process. See
[Restart mechanics](cli-commands.md#restart-mechanics-modulesgracefulrestart_unixgo).

Gitea's graceful manager also participates in the **systemd notify
protocol** (`Type=notify` is not set in the shipped unit, but the manager
code supports it): it reports `READY=1` and `MAINPID=<pid>` once startup
completes, `STOPPING=1` during shutdown, and pings the systemd watchdog if
`WATCHDOG_USEC` is present in the environment. To opt into this tighter
integration, change `Type=simple` to `Type=notify` in a local override.

Standard operational commands:

```sh
sudo systemctl daemon-reload         # after editing the unit file
sudo systemctl enable --now gitea    # enable at boot + start now
sudo systemctl status gitea
sudo journalctl -u gitea -f          # follow logs (if logging to stdout/journal)
```

## SysV Init (`contrib/service/sysvinit/gitea`)

A traditional `/etc/init.d/gitea` LSB-style script for older/legacy
distributions without systemd. Declares LSB header metadata
(`Required-Start: $syslog $network`, `Default-Start: 2 3 4 5`) and implements
`start`/`stop`/`status`/`restart` using **`start-stop-daemon`**:

```sh
DAEMON=/usr/local/bin/gitea
DAEMON_ARGS="web -c /etc/gitea/app.ini"
PIDFILE=/run/gitea.pid
WORKINGDIR=/var/lib/gitea
USER=git
STOP_SCHEDULE="${STOP_SCHEDULE:-QUIT/5/TERM/1/KILL/5}"
```

- **`do_start`** backgrounds the process via `start-stop-daemon --start
  --background --make-pidfile --chdir $WORKINGDIR --chuid $USER`, wrapping
  the actual invocation in `/bin/bash -c '/usr/bin/env USER=... GITEA_WORK_DIR=... HOME=... gitea -- web -c ...'`
  so the environment variables are set before `gitea` executes.
- **`do_stop`** uses `start-stop-daemon --stop --retry=$STOP_SCHEDULE`, where
  `STOP_SCHEDULE=QUIT/5/TERM/1/KILL/5` means: send `SIGQUIT`, wait up to 5s,
  send `SIGTERM`, wait up to 1s, then `SIGKILL` as a last resort — a
  deliberately graduated escalation so a hung process still gets forcibly
  terminated within a bounded time, while giving Gitea's normal
  `SIGTERM`-triggered graceful shutdown a fair chance first.
- **`do_status`** checks `kill -0 $(cat $PIDFILE)` to report whether the
  recorded PID is actually alive (handles the classic "stale pidfile" case).
- Configuration overrides live in `/etc/default/gitea` (sourced if present,
  standard Debian/Ubuntu convention), letting deployments override `USER`,
  `WORKINGDIR`, `DAEMON_ARGS`, or `STOP_SCHEDULE` without editing the script
  itself.

Install by copying to `/etc/init.d/gitea`, `chmod +x`, then register with
`update-rc.d gitea defaults` (Debian family) or `chkconfig --add gitea`
(RHEL family).

## OpenRC / Gentoo (`contrib/service/gentoo/gitea`)

An `openrc-run` script (Gentoo, Alpine when using OpenRC instead of its
default `/etc/init.d` scripts, and other OpenRC-based distributions):

```sh
#!/sbin/openrc-run
command="/usr/local/bin/gitea"
command_user="git"
command_args="web -c /etc/$RC_SVCNAME/app.ini"
command_background="yes"
pidfile="/run/$RC_SVCNAME/$RC_SVCNAME.pid"
start_stop_daemon_args="--user git --chdir /var/lib/gitea"
```

- **`depend()`** declares `need net` and comments out optional `after`
  dependencies on `postgresql`/`mysql`/`mariadb`/`memcached`/`redis` — the
  same "start the DB first" pattern as the systemd unit, expressed in
  OpenRC's dependency DSL.
- **`start_pre()`** calls `checkpath --directory --owner git:git --mode 0750`
  to ensure `/run/gitea` and `/var/log/gitea` exist with correct ownership
  before the daemon starts (OpenRC's `/run` is often tmpfs and needs
  recreating on every boot) — this replaces the systemd unit's
  `RuntimeDirectory=` equivalent. It also documents the same
  `setcap cap_net_bind_service=+ep` option for privileged ports.
- `command_background="yes"` tells `start-stop-daemon` (which OpenRC uses
  internally) to fork Gitea into the background itself, since `gitea web`
  does not daemonize on its own.

Enable and control with:

```sh
rc-update add gitea default
rc-service gitea start
```

## OpenWrt (`contrib/service/openwrt/gitea`)

An `/etc/rc.common`-based **procd** service definition for OpenWrt routers/
embedded Linux, appropriate for small/ARM deployments:

```sh
#!/bin/sh /etc/rc.common
USE_PROCD=1
START=90
STOP=10

start_service(){
    procd_open_instance gitea
    procd_set_param env GITEA_WORK_DIR=$GITEA_WORK_DIR
    procd_set_param env HOME=$GITEA_WORK_DIR
    procd_set_param command $PROG web -c $CONF_FILE
    procd_set_param file $CONF_FILE
    procd_set_param user git
    procd_set_param respawn ${respawn_threshold:-3600} ${respawn_timeout:-5} ${respawn_retry:-5}
    procd_close_instance
}
```

- `START=90`/`STOP=10` set this service to start late (after most other
  system services) and stop early during shutdown.
- `procd_set_param file $CONF_FILE` tells `procd` to **watch the config file**
  and automatically restart the `gitea` instance if `app.ini` changes on
  disk — a convenience not present in any of the other init systems.
- `procd_set_param respawn <threshold> <timeout> <retry>` configures
  automatic respawn-on-crash with rate limiting, to avoid crash-looping
  forever if Gitea fails to start repeatedly.
- Exposes standard `start`/`stop`/`reload` shell functions delegating to
  `service_start`/`service_stop`/`service_reload $PROG`.

## FreeBSD `rc.d` (`contrib/service/freebsd/gitea`)

A standard FreeBSD `/usr/local/etc/rc.d/gitea` script using the `rc.subr`
framework:

```sh
name="gitea"
rcvar="gitea_enable"
: ${gitea_user:="git"}
: ${gitea_directory:="/var/lib/gitea"}
command="/usr/local/bin/gitea web -c /etc/gitea/app.ini"
pidfile="${gitea_directory}/${name}.pid"
```

- Controlled entirely through `/etc/rc.conf` variables — set
  `gitea_enable="YES"` to enable at boot, and optionally override
  `gitea_user`/`gitea_directory`.
- `gitea_start()` exports `USER`/`HOME`/`GITEA_WORK_DIR`, `cd`s into the work
  directory, then daemonizes via **`/usr/sbin/daemon -f -u <user> -p
  <pidfile> <command>`** — FreeBSD's built-in daemonizer, analogous to
  `start-stop-daemon` on Linux.
- `gitea_stop()` reads the PID file directly and sends a default `kill`
  (`SIGTERM`), relying on Gitea's own graceful-shutdown handling rather than
  any escalation schedule.
- Enable/manage via `service gitea start`/`stop`/`status` once
  `gitea_enable="YES"` is in `/etc/rc.conf`.

## OpenBSD `rc.d` (`contrib/service/openbsd/gitea`)

OpenBSD's minimal `rc.d`/`rc.subr` convention, one of the shortest scripts in
the set:

```sh
daemon="/usr/local/bin/gitea"
daemon_user="git"
daemon_flags="web -c /etc/gitea/app.ini"
gitea_directory="/var/lib/gitea"
rc_bg=YES

rc_start() {
    ${rcexec} "cd ${gitea_directory}; ${daemon} ${daemon_flags} ${_bg}"
}
rc_cmd $1
```

- `rc_bg=YES` tells OpenBSD's `rc.subr` to background the daemon
  automatically (again compensating for `gitea web` not self-daemonizing).
- `rc_start()` overrides only the start behavior (to `cd` into the working
  directory first); stop/restart/status/check fall back to `rc.subr`'s
  built-in generic implementations, which track the PID via
  `pkill`/`pgrep`-style matching against `${daemon}`.
- Install to `/etc/rc.d/gitea`, then enable via `rcctl enable gitea` and
  control via `rcctl start|stop|restart gitea`.

## Solaris/illumos SMF (`contrib/service/sunos/gitea.xml`)

A Service Management Facility (SMF) manifest for Solaris/illumos-derived
systems (OmniOS, SmartOS), imported with `svccfg import gitea.xml`:

```xml
<service name="gitea" type="service" version="1">
  <dependency name="network" .../>
  <dependency name="filesystem" .../>
  <exec_method type="method" name="start"
      exec="/opt/local/bin/gitea web" timeout_seconds="60">
    <method_context>
      <method_credential user="git" group="git" />
      <method_environment>
        <envvar name='GITEA_WORK_DIR' value='/opt/local/share/gitea'/>
        <envvar name='GITEA_CUSTOM' value='/opt/local/etc/gitea'/>
        <envvar name='HOME' value='/var/db/gitea'/>
        ...
      </method_environment>
    </method_context>
  </exec_method>
  <exec_method type="method" name="stop" exec=":kill" timeout_seconds="60"/>
  ...
</service>
```

Distinctive aspects of the SMF model compared to the Linux/BSD scripts:

- **Declarative dependencies** — `network` and `filesystem/local` are
  declared as SMF service dependencies (not shell-script ordering hints),
  and SMF's fault-management daemon (`svc.startd`) automatically restarts
  the service if it exits unexpectedly, without any explicit "restart
  policy" configuration in the manifest.
- **`exec=":kill"` for stop** — SMF's built-in `:kill` method sends
  `SIGTERM` (escalating to `SIGKILL` after `timeout_seconds`) rather than
  requiring a custom stop script.
- **`GITEA_CUSTOM`** is set explicitly (unlike the other scripts, which rely
  on `--config`/`-c`) — pointing to Gitea's `custom/` override directory
  directly via environment variable instead of a config-file flag.
- **`create_default_instance enabled="false"`** — the service is imported in
  a disabled state; an operator must explicitly `svcadm enable gitea` after
  import (a deliberate safety default so the service doesn't start
  unconfigured).

Operate with `svcadm enable/disable/restart gitea` and inspect state with
`svcs gitea` / `svcs -xv gitea`.

## macOS `launchd` (`contrib/service/launchd/io.gitea.web.plist`)

A per-machine (or per-user, if placed under `~/Library/LaunchAgents`)
`launchd` property list for running Gitea on macOS:

```xml
<key>Label</key><string>io.gitea.web</string>
<key>UserName</key><string>git</string>
<key>GroupName</key><string>git</string>
<key>ProgramArguments</key>
<array>
  <string>/Users/git/gitea/gitea</string>
  <string>web</string>
</array>
<key>RunAtLoad</key><true/>
<key>KeepAlive</key><true/>
<key>WorkingDirectory</key><string>/Users/git/gitea/</string>
<key>StandardOutPath</key><string>/Users/git/gitea/log/stdout.log</string>
<key>StandardErrorPath</key><string>/Users/git/gitea/log/stderr.log</string>
<key>SoftResourceLimits</key>
<dict><key>NumberOfFiles</key><integer>8192</integer></dict>
```

- **`RunAtLoad`** starts Gitea as soon as the plist is loaded (at boot for a
  `LaunchDaemon`, at login for a `LaunchAgent`); **`KeepAlive`** tells
  `launchd` to restart the process whenever it exits, regardless of exit
  code — the macOS equivalent of `Restart=always`.
  `SoftResourceLimits.NumberOfFiles=8192` raises the default open-file
  limit (macOS's default of 256 is documented as too low for Gitea's
  parallel-pipe usage patterns, e.g. concurrent git subprocess I/O).
- No `--config` flag is passed — Gitea falls back to discovering
  `custom/conf/app.ini` relative to the binary/working directory. Adjust
  `ProgramArguments` to add `--config /path/to/app.ini` if a non-default
  location is needed.
- Because paths are hardcoded to a specific user's home directory
  (`/Users/git/gitea/...`), every path in the plist **must** be edited to
  match the actual install location before use — the file is explicitly
  commented as a template.

Install to `/Library/LaunchDaemons/io.gitea.web.plist` (system-wide,
requires `sudo launchctl load`) or `~/Library/LaunchAgents/io.gitea.web.plist`
(per-user), then:

```sh
sudo launchctl load /Library/LaunchDaemons/io.gitea.web.plist
sudo launchctl start io.gitea.web
```

## Supervisor (`contrib/service/supervisor/gitea`)

A platform-agnostic fallback for environments that use
[Supervisor](http://supervisord.org/) as their process manager instead of
(or on top of) the OS's native init system — common in containerized or
PaaS-style deployments that already standardize on Supervisor for managing
multiple processes:

```ini
[program:gitea]
directory=/home/git/go/src/github.com/go-gitea/gitea/
command=/home/git/go/src/github.com/go-gitea/gitea/gitea web
autostart=true
autorestart=true
startsecs=10
stdout_logfile=/var/log/gitea/stdout.log
stdout_logfile_maxbytes=1MB
stdout_logfile_backups=10
stderr_logfile=/var/log/gitea/stderr.log
stderr_logfile_maxbytes=1MB
stderr_logfile_backups=10
user = git
environment = HOME="/home/git", USER="git"
```

- `autostart=true` + `autorestart=true` mirror the "start at boot, restart on
  crash" behavior of the native init systems.
- `startsecs=10` — Supervisor only considers the process "successfully
  started" if it stays up for 10 seconds, catching immediate crash-loops
  (e.g. a bad config) before marking the program healthy.
- Built-in **log rotation** (`stdout_logfile_maxbytes`/`_backups`) is
  configured directly in the program stanza, since Supervisor manages log
  file rotation itself rather than delegating to `logrotate`.
- Note the hardcoded example path assumes a source checkout under
  `$GOPATH/src/github.com/go-gitea/gitea/` — production deployments should
  point `directory`/`command` at wherever the release binary is actually
  installed, and typically pass `-c /etc/gitea/app.ini` explicitly rather
  than relying on binary-relative config discovery.
- Reload after editing with `supervisorctl reread && supervisorctl update`,
  then manage with `supervisorctl start|stop|restart gitea`.

## Choosing Between Init-Managed Restart and Gitea's Own Graceful Restart

Every script above gives the OS/process-manager ownership of "process
supervision" (start at boot, restart on crash). This is orthogonal to — and
by default takes precedence over — Gitea's **own** in-process graceful
restart mechanism (`SIGHUP` → fork-and-hand-off, gated by
`app.ini`'s `[server] ALLOW_GRACEFUL_RESTARTS` /
`setting.GracefulRestartable`), documented in depth in
[CLI & Admin Operations — Graceful Restart & Shutdown](cli-commands.md#graceful-restart--shutdown).

| Scenario | Recommended approach |
|---|---|
| Config change requiring a full reload, managed by systemd/OpenRC/etc. | `systemctl restart gitea` / `rc-service gitea restart` (new PID, brief listener gap unless socket-activated) |
| Zero-downtime binary upgrade or config reload, self-managed | Ensure `ALLOW_GRACEFUL_RESTARTS` is `true` (the default), then signal `SIGHUP` directly (or via a process-manager "reload" hook if it forwards signals rather than restarting) |
| Runtime-only operations (flush queues, rotate logs, pause logging, cancel a stuck process) | `gitea manager ...` subcommands over the internal API — see [`gitea manager`](cli-commands.md#gitea-manager--controlling-a-running-process) — these require **no process restart at all** |
| External log rotation (`logrotate`, etc.) | `gitea manager logging release-and-reopen`, triggered from the rotation tool's `postrotate` hook, regardless of which init system starts Gitea |

Container-based deployments (Docker/Kubernetes) use a different mechanism
entirely — the official image's `docker/root/etc/s6/` scripts run Gitea
under **s6-svscan**, with the container runtime itself (not one of the
scripts above) responsible for restart policy; see
[Getting Started — Installation & Build](../03-getting-started/installation-and-build.md)
for background on the various installation paths, including containers.

## Related Pages

- [CLI & Admin Operations](cli-commands.md) — the `web`, `manager`, and
  graceful-restart internals these service files ultimately invoke
- [Getting Started — Running Gitea](../03-getting-started/running-gitea.md) —
  manual/foreground startup and general deployment guidance
- [Configuration (`app.ini`)](../03-getting-started/configuration-app-ini.md) —
  `WORK_PATH`, `[server] ALLOW_GRACEFUL_RESTARTS`, and other settings these
  scripts assume
- [Admin Guide — Admin Panel & Operations](../18-admin-guide/admin-panel-and-operations.md) —
  higher-level operational guidance once Gitea is running as a service
