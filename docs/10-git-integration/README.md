# Git Integration

How Gitea interacts with the underlying Git binary, on-disk repository
storage, and the SSH/HTTP transports that carry `git push`/`git fetch`
traffic to and from it.

Gitea does not reimplement Git — it shells out to (and parses the output of)
the system `git` binary through the `modules/git` package (or, optionally, a
pure-Go `go-git`-backed implementation selected at compile time), resolves
repository paths and caches open handles through `modules/gitrepo`, and
layers Git LFS support and server-side push/receive hooks on top. The deepest
technical reference for the dual-backend Git engine and LFS/hook internals is
documented under **09 · Core Modules** (since it is a dependency-free shared
module used everywhere in the codebase); this section frames the same
material from the "how does a push actually flow through the system"
perspective and adds the `gitrepo` abstraction and hook-lifecycle detail that
core-modules coverage summarizes only briefly.

## Section Contents

| Page | Description |
|---|---|
| [Git Backends & Cat-File Batch Processes](git-backends-and-catfile.md) | Summary of the `gogit`/`nogogit` build-tag backends and the long-lived `git cat-file --batch`/`--batch-command` subprocess protocol, with pointers to the full reference |
| [GitRepo & Repository Access](gitrepo-and-repository-access.md) | The `modules/gitrepo` abstraction: resolving a database `Repository` to an on-disk path, request-scoped handle caching, write-lock serialization, and the path-aware wrappers services call instead of touching `modules/git` directly |
| [Git Operations & Server-Side Hooks](git-operations-and-hooks.md) | The hook delegation/installation pattern, and a full sequence diagram tracing a `git push` over SSH through `modules/ssh` → `cmd/serv.go` → the internal private API → `git-receive-pack` → `pre-receive`/`post-receive` |
| [Git Module](../09-core-modules/git-module.md) | The `modules/git` wrapper: repository objects, commits, branches, diffs, and command execution (canonical deep reference) |
| [Git LFS & Server-Side Hooks](../09-core-modules/lfs-and-hooks.md) | Git LFS object storage/transfer and the `pre-receive`/`post-receive`/`update`/`proc-receive` hook pipeline (canonical deep reference) |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the repository ORM entity that wraps a Git repo on disk | [Repository Model](../05-database-models/repository-model.md) |
| See how a push triggers webhooks and Actions | [Webhook Delivery Pipeline](../16-webhooks-integrations/webhook-delivery-pipeline.md) |
| See how `gitea doctor` detects broken/out-of-date hooks | [Backup, Restore & Doctor](../18-admin-guide/backup-restore-and-doctor.md) |
| See all other shared internal modules | [Core Modules](../09-core-modules/README.md) |
