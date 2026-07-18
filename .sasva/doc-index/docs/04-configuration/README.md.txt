=== FILE: docs/04-configuration/README.md ===
=== METADATA: format=md ===
[SUMMARY] # Configuration Details on configuring Gitea via `app.ini` settings and environment variables. Gitea is configured through a single INI-format file (`app.ini`), loaded and parsed by `modules/setting`. Nearly every subsystem — database, mailer, storage, cache, queue, sessions, package registry, Actions — has its own INI section with typed Go struct bindings. See [Configuration (`app.ini`)](../03-getting-started/configuration-app-ini.

# Configuration

Details on configuring Gitea via `app.ini` settings and environment variables.

Gitea is configured through a single INI-format file (`app.ini`), loaded and
parsed by `modules/setting`. Nearly every subsystem — database, mailer,
storage, cache, queue, sessions, package registry, Actions — has its own INI
section with typed Go struct bindings. See
[Configuration (`app.ini`)](../03-getting-started/configuration-app-ini.md) in
Getting Started for the file format and how it is loaded, and the
[Settings Catalog](settings-catalog.md) in this section for the exhaustive
reference of sections and keys.

## Section Contents

| Page | Description |
|---|---|
| [Settings Catalog](settings-catalog.md) | Reference table of `app.ini` sections/keys, their Go binding structs in `modules/setting`, defaults, and purpose |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the INI file format and how it's loaded | [Configuration (`app.ini`)](../03-getting-started/configuration-app-ini.md) |
| Configure storage, cache, or queue backends | [Storage, Queue & Caching](../09-core-modules/storage-queue-cache.md) |
| Configure authentication providers | [Authentication & Authorization](../08-services/auth-providers.md) |
