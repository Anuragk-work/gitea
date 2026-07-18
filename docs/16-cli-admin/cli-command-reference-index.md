# CLI Command Reference Index

A condensed, alphabetically sorted lookup table of every `gitea` CLI
subcommand implemented under [`cmd/`](../../cmd), cross-checked against the
`cmd/*.go` source files. Use this page to quickly locate the source file and
constructor function for any subcommand; see
[CLI & Admin Operations](cli-commands.md) for the full narrative reference
(flags, sequencing, graceful-restart internals, and usage examples).

> Commands are listed by their **full invocation path** (e.g.
> `admin auth add-ldap`), sorted alphabetically by that path. Internal-only
> commands (invoked by `sshd`/`git`, not intended for interactive use) are
> marked accordingly.

## Full Alphabetical Command Table

| Command Path | Source File | Constructor Function | Internal Only? | Purpose |
|---|---|---|:---:|---|
| `actions` | `cmd/actions.go` | `newActionsCommand` | No | Parent command for Gitea Actions administration |
| `actions generate-runner-token` | `cmd/actions.go` | `newActionsGenerateRunnerTokenCommand` | No | Generate a registration token for an Actions runner (`--scope`) |
| `admin` | `cmd/admin.go` | `newAdminCommand` | No | Parent command for common administrative operations |
| `admin auth` | `cmd/admin.go` | `newAuthCommand` | No | Parent command for managing external authentication sources |
| `admin auth add-ldap` | `cmd/admin_auth_ldap.go` | `microcmdAuthAddLdapBindDn` | No | Add an LDAP (via bind DN) authentication source |
| `admin auth add-ldap-simple` | `cmd/admin_auth_ldap.go` | `microcmdAuthAddLdapSimpleAuth` | No | Add an LDAP (simple auth) authentication source |
| `admin auth add-oauth` | `cmd/admin_auth_oauth.go` | `microcmdAuthAddOauth` | No | Add an OAuth2/OIDC authentication source |
| `admin auth add-smtp` | `cmd/admin_auth_smtp.go` | `microcmdAuthAddSMTP` | No | Add an SMTP authentication source |
| `admin auth delete` | `cmd/admin_auth.go` | `newAuthDeleteCommand` | No | Delete an authentication source by `--id` |
| `admin auth list` | `cmd/admin_auth.go` | `newAuthListCommand` | No | List configured authentication sources (supports table-formatting flags: `--min-width`, `--tab-width`, `--padding`, `--pad-char`, `--vertical-bars`) |
| `admin auth update-ldap` | `cmd/admin_auth_ldap.go` | `microcmdAuthUpdateLdapBindDn` | No | Update an LDAP (via bind DN) authentication source |
| `admin auth update-ldap-simple` | `cmd/admin_auth_ldap.go` | `microcmdAuthUpdateLdapSimpleAuth` | No | Update an LDAP (simple auth) authentication source |
| `admin auth update-oauth` | `cmd/admin_auth_oauth.go` | `microcmdAuthUpdateOauth` | No | Update an OAuth2/OIDC authentication source by `--id` |
| `admin auth update-smtp` | `cmd/admin_auth_smtp.go` | `microcmdAuthUpdateSMTP` | No | Update an SMTP authentication source by `--id` |
| `admin regenerate` | `cmd/admin.go` | `newRegenerateCommand` | No | Parent command for regenerating server-managed files |
| `admin regenerate hooks` | `cmd/admin_regenerate.go` | `newRegenerateHooksCommand` | No | Regenerate Git server-side hooks for all repositories (`repo_service.SyncRepositoryHooks`) |
| `admin regenerate keys` | `cmd/admin_regenerate.go` | `newRegenerateKeysCommand` | No | Regenerate the SSH `authorized_keys` file (`asymkey_service.RewriteAllPublicKeys`) |
| `admin repo-sync-releases` | `cmd/admin.go` | `newRepoSyncReleasesCommand` | No | Synchronize repository releases with Git tags |
| `admin sendmail` | `cmd/admin.go` | `newSendMailCommand` | No | Send a broadcast message/notification to all users (`--title`, `--content`, `--force`) |
| `admin user` | `cmd/admin_user.go` | `newUserCommand` | No | Parent command for user account administration |
| `admin user change-password` | `cmd/admin_user_change_password.go` | `microcmdUserChangePassword` | No | Change a user's password (`--username`, `--password`, `--must-change-password`) |
| `admin user create` | `cmd/admin_user_create.go` | `microcmdUserCreate` | No | Create a new user account (`--username`, `--password`, `--email`, `--admin`, `--random-password`, `--must-change-password`, `--access-token`, `--restricted`, `--fullname`, `--user-type`) |
| `admin user delete` | `cmd/admin_user_delete.go` | `microcmdUserDelete` | No | Delete a user account by `--id`, `--username`, or `--email` (`--purge` removes owned repos/orgs too) |
| `admin user disable-2fa` | `cmd/admin_user_disable_2fa.go` | `microcmdUserDisableTwoFactor` | No | Disable two-factor authentication for a user (`--username` or `--id`) |
| `admin user generate-access-token` | `cmd/admin_user_generate_access_token.go` | `newUserGenerateAccessTokenCommand` | No | Generate a personal access token for a specific user (`--username`, `--token-name`, `--scopes`, `--raw`) |
| `admin user list` | `cmd/admin_user_list.go` | `newUserListCommand` | No | List all user accounts (`--admin` filters to admin users only) |
| `admin user must-change-password` | `cmd/admin_user_must_change_password.go` | `microcmdUserMustChangePassword` | No | Set/unset the must-change-password flag for specified users or `--all` (with `--exclude`, `--unset`) |
| `cert` | `cmd/cert.go` | `cmdCert` | No | Generate a self-signed TLS certificate (`cert.pem`/`key.pem`) for a given `--host` |
| `config` | `cmd/config.go` | `cmdConfig` | No | Parent command for INI configuration file management |
| `config edit-ini` | `cmd/config.go` | `subcmdConfigEditIni` (local var in `cmdConfig`), Action: `runConfigEditIni` | No | Load an INI file, optionally keep only specified keys, apply `GITEA__*` env vars, and write out a new INI file |
| `docs` | `cmd/docs.go` | `newDocsCommand` | No | Render CLI reference documentation to Markdown or man pages (`--man`, `--output`) |
| `doctor` | `cmd/doctor.go` | `newDoctorCommand` | No | Parent command for diagnostics, table recreation, and DB conversion |
| `doctor check` | `cmd/doctor.go` | `newDoctorCheckCommand` | No | Run diagnostic checks (`--list`, `--default`, `--run`, `--all`, `--fix`, `--log-file`, `--color`) |
| `doctor convert` | `cmd/doctor_convert.go` | `newDoctorConvertCommand` | No | Convert the database character set/collation |
| `doctor recreate-table` | `cmd/doctor.go` | `newRecreateTableCommand` | No | Recreate one or more tables from current XORM struct definitions, copying existing data (`[TABLE]...` args, `--debug`) |
| `dump` | `cmd/dump.go` | `newDumpCommand` | No | Create a full backup archive of Gitea files and database (`--file`, `--type`, `--database`, `--skip-*` flags) |
| `dump-repo` | `cmd/dump_repo.go` | `newDumpRepositoryCommand` | No | Dump a single repository from a local path or a git/GitHub/Gitea/GitLab remote (`--git_service`, `--repo_dir`, `--clone_addr`, `--auth_username`/`--auth_password`/`--auth_token`, `--owner_name`, `--repo_name`, `--units`) |
| `embedded` | `cmd/embedded.go` | `newEmbeddedCommand` | No | Parent command for inspecting/extracting assets baked into the binary |
| `embedded extract` | `cmd/embedded.go` | `newEmbeddedExtractCommand` | No | Extract embedded resources to disk (`--include-vendored`, `--overwrite`, `--rename`, `--custom`, `--destination`) |
| `embedded list` | `cmd/embedded.go` | `newEmbeddedListCommand` | No | List embedded files matching a pattern (`--include-vendored`) |
| `embedded view` | `cmd/embedded.go` | `newEmbeddedViewCommand` | No | Print the contents of an embedded file matching a pattern (`--include-vendored`) |
| `generate` | `cmd/generate.go` | `newGenerateCommand` | No | Parent command for generating secrets and SSH keys |
| `generate secret` | `cmd/generate.go` | `newGenerateSecretCommand` | No | Parent command for generating configuration secrets |
| `generate secret INTERNAL_TOKEN` | `cmd/generate.go` | `newGenerateInternalTokenCommand` | No | Generate a value for `[security] INTERNAL_TOKEN` |
| `generate secret JWT_SECRET` | `cmd/generate.go` | `newGenerateLfsJWTSecretCommand` | No | Generate a value for `[oauth2] JWT_SECRET` (used for LFS/OAuth2 JWTs) |
| `generate secret SECRET_KEY` | `cmd/generate.go` | `newGenerateSecretKeyCommand` | No | Generate a value for `[security] SECRET_KEY` |
| `generate ssh` | `cmd/generate.go` | `newGenerateSSHCommand` | No | Parent command for generating SSH key material |
| `generate ssh host-keys` | `cmd/generate.go` | `newGenerateSSHHostKeysCommand` | No | Generate SSH host key pairs into `--dir` |
| `generate ssh key` | `cmd/generate.go` | `newGenerateSSHKeyCommand` | No | Generate an SSH key pair (`--bits`, `--type`, `--file`, required) |
| `hook` | `cmd/hook.go` | `newHookCommand` | **Yes** | Parent dispatcher for Git server-side hooks, invoked by `git` itself |
| `hook post-receive` | `cmd/hook.go` | `newHookPostReceiveCommand` | **Yes** | Delegate for the Git `post-receive` hook (`--debug`) |
| `hook pre-receive` | `cmd/hook.go` | `newHookPreReceiveCommand` | **Yes** | Delegate for the Git `pre-receive` hook (`--debug`) |
| `hook proc-receive` | `cmd/hook.go` | `newHookProcReceiveCommand` | **Yes** | Delegate for the Git `proc-receive` hook (`--debug`) |
| `hook update` | `cmd/hook.go` | `newHookUpdateCommand` | **Yes** | Delegate for the Git `update` hook (`--debug`) |
| `keys` | `cmd/keys.go` | `NewKeysCommand` | **Yes** | SSH `authorized_keys` command lookup, invoked by `sshd`'s `AuthorizedKeysCommand` (`--expected`, `--username`, `--type`, `--content`) |
| `manager` | `cmd/manager.go` | `newManagerCommand` | No | Parent command for remote-controlling a running Gitea instance via the internal API |
| `manager flush-queues` | `cmd/manager.go` | `newFlushQueuesCommand` | No | Flush all queues in the running process (`--timeout`, `--non-blocking`, `--debug`) |
| `manager logging` | `cmd/manager_logging.go` | `newLoggingCommand` | No | Parent command for runtime logger management |
| `manager logging add conn` | `cmd/manager_logging.go` | Action: `runAddConnLogger` | No | Add a network-connection log writer at runtime (`--reconnect-on-message`, `--reconnect`, `--protocol`, plus shared writer flags from `defaultLoggingFlags`) |
| `manager logging add file` | `cmd/manager_logging.go` | Action: `runAddFileLogger` | No | Add a file log writer at runtime (`--filename`, `--rotate`, `--max-size`, `--daily`, `--max-days`, `--compress`, `--compression-level`, plus shared writer flags from `defaultLoggingFlags`) |
| `manager logging log-sql` | `cmd/manager_logging.go` | Action: `runSetLogSQL` | No | Enable/disable SQL statement logging at runtime (`--off`, `--debug`) |
| `manager logging pause` | `cmd/manager_logging.go` | Action: `runPauseLogging` | No | Pause all runtime logging (`--debug`) |
| `manager logging release-and-reopen` | `cmd/manager_logging.go` | Action: `runReleaseReopenLogging` | No | Release and reopen all log files (e.g. after external log rotation) (`--debug`) |
| `manager logging remove` | `cmd/manager_logging.go` | Action: `runRemoveLogger` | No | Remove a named logger/writer at runtime (`--logger`, `--debug`) |
| `manager logging resume` | `cmd/manager_logging.go` | Action: `runResumeLogging` | No | Resume paused runtime logging (`--debug`) |
| `manager processes` | `cmd/manager.go` | `newProcessesCommand` | No | Display running processes tracked by the process manager (`--flat`, `--no-system`, `--stacktraces`, `--json`, `--cancel`, `--debug`) |
| `manager reload-templates` | `cmd/manager.go` | `newReloadTemplatesCommand` | No | Reload HTML template files in the running process (`--debug`) |
| `manager restart` | `cmd/manager.go` | `newRestartCommand` | No | Gracefully restart the running process (not implemented on Windows) (`--debug`) |
| `manager shutdown` | `cmd/manager.go` | `newShutdownCommand` | No | Gracefully shut down the running process (`--debug`) |
| `migrate` | `cmd/migrate.go` | `newMigrateCommand` | No | Run all pending database migrations |
| `migrate-storage` | `cmd/migrate_storage.go` | `newMigrateStorageCommand` | No | Move stored blobs between storage backends (`--type`, `--storage`, `--path`, plus `minio-*`/`azureblob-*` connection flags) |
| `restore-repo` | `cmd/restore_repo.go` | `newRestoreRepositoryCommand` | No | Restore a repository previously dumped by `dump-repo` (`--repo_dir`, `--owner_name`, `--repo_name`, `--units`, `--validation`) |
| `serv` | `cmd/serv.go` | `newServCommand` | **Yes** | Git-over-SSH command dispatcher, invoked by `sshd`'s `ForceCommand`/`AuthorizedKeysCommand` pipeline (`--enable-pprof`, `--debug`) |
| `web` | `cmd/web.go` | `newWebCommand` | No | Start the Gitea HTTP(S)/FCGI web server; also the implicit default command (`--port`, `--install-port`, `--pid`, `--quiet`, `--verbose`) |

## Command Count Cross-Check

The table above enumerates **74** distinct invocation paths (including
parent/group commands), sourced from the `*Command()` constructor functions
and inline `&cli.Command{Name: ...}` literals found across all
non-test `cmd/*.go` files. This was cross-checked against the following file
inventory obtained from `cmd/*.go` (excluding `_test.go` files):

| Source File | Commands Contributed |
|---|---|
| `cmd/actions.go` | `actions`, `actions generate-runner-token` |
| `cmd/admin.go` | `admin`, `admin auth`, `admin regenerate`, `admin repo-sync-releases`, `admin sendmail` |
| `cmd/admin_auth.go` | `admin auth delete`, `admin auth list` |
| `cmd/admin_auth_ldap.go` | `admin auth add-ldap`, `admin auth add-ldap-simple`, `admin auth update-ldap`, `admin auth update-ldap-simple` |
| `cmd/admin_auth_oauth.go` | `admin auth add-oauth`, `admin auth update-oauth` |
| `cmd/admin_auth_smtp.go` | `admin auth add-smtp`, `admin auth update-smtp` |
| `cmd/admin_regenerate.go` | `admin regenerate hooks`, `admin regenerate keys` |
| `cmd/admin_user.go` | `admin user` |
| `cmd/admin_user_change_password.go` | `admin user change-password` |
| `cmd/admin_user_create.go` | `admin user create` |
| `cmd/admin_user_delete.go` | `admin user delete` |
| `cmd/admin_user_disable_2fa.go` | `admin user disable-2fa` |
| `cmd/admin_user_generate_access_token.go` | `admin user generate-access-token` |
| `cmd/admin_user_list.go` | `admin user list` |
| `cmd/admin_user_must_change_password.go` | `admin user must-change-password` |
| `cmd/cert.go` | `cert` |
| `cmd/config.go` | `config`, `config edit-ini` |
| `cmd/docs.go` | `docs` |
| `cmd/doctor.go` | `doctor`, `doctor check`, `doctor recreate-table` |
| `cmd/doctor_convert.go` | `doctor convert` |
| `cmd/dump.go` | `dump` |
| `cmd/dump_repo.go` | `dump-repo` |
| `cmd/embedded.go` | `embedded`, `embedded extract`, `embedded list`, `embedded view` |
| `cmd/generate.go` | `generate`, `generate secret`, `generate secret INTERNAL_TOKEN`, `generate secret JWT_SECRET`, `generate secret SECRET_KEY`, `generate ssh`, `generate ssh host-keys`, `generate ssh key` |
| `cmd/hook.go` | `hook`, `hook post-receive`, `hook pre-receive`, `hook proc-receive`, `hook update` |
| `cmd/keys.go` | `keys` |
| `cmd/main.go` | (assembles the root `gitea` app and wires all subcommands above; not itself a subcommand) |
| `cmd/manager.go` | `manager`, `manager flush-queues`, `manager processes`, `manager reload-templates`, `manager restart`, `manager shutdown` |
| `cmd/manager_logging.go` | `manager logging`, `manager logging add conn`, `manager logging add file`, `manager logging log-sql`, `manager logging pause`, `manager logging release-and-reopen`, `manager logging remove`, `manager logging resume` |
| `cmd/migrate.go` | `migrate` |
| `cmd/migrate_storage.go` | `migrate-storage` |
| `cmd/restore_repo.go` | `restore-repo` |
| `cmd/serv.go` | `serv` |
| `cmd/web.go` | `web` |
| `cmd/web_acme.go`, `cmd/web_graceful.go`, `cmd/web_https.go` | No CLI commands — internal support for `web` (ACME/manual TLS/graceful listener wiring) |
| `cmd/helper.go` | No CLI commands — shared helpers (`initDB`, `installSignals`, `isValidDefaultSubCommand`, `confirm`, `handleCliResponseExtra`) used by the commands above |

Files intentionally excluded from the cross-check because they contain no
`cli.Command` definitions: all `*_test.go` files, `cmd/cmdtest/cmd_test.go`.

## Where to Go Next

| If you want to... | Go to |
|---|---|
| Read full flag tables, sequencing diagrams, and usage examples for each command | [CLI & Admin Operations](cli-commands.md) |
| See how these commands are wired into service supervisors (systemd, SysV, etc.) | [Running Gitea as a System Service](service-management.md) |
| See the `app.ini` settings these commands read/write | [Settings Catalog](../04-configuration/settings-catalog.md) |
| See day-to-day administration guidance built on top of these commands | [Admin Guide](../18-admin-guide/README.md) |
