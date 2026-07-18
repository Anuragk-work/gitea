# Search & Indexing

Gitea ships with a pluggable indexing subsystem that powers three distinct search experiences:

1. **Code search** — full-text search over the contents of a repository's default branch.
2. **Issue/PR search** — full-text and filtered search over issues and pull requests.
3. **Repository statistics / language detection** — per-repository programming-language breakdown (used for the language bar on the repo home page).

All three live under `modules/indexer/` and share a common design philosophy: a small internal `Indexer` interface, several interchangeable backend implementations (Bleve, Elasticsearch, Meilisearch, or the SQL database itself), and a background queue that keeps the index in sync with repository/issue activity. The wiring that connects these indexers to Gitea's notification system lives in `services/indexer/`.

> Source locations referenced in this page:
> - `modules/indexer/internal/` — shared base indexer interface
> - `modules/indexer/code/` — code (repository content) indexer
> - `modules/indexer/issues/` — issue/PR indexer
> - `modules/indexer/stats/` — repository language-statistics indexer
> - `services/indexer/` — queue wiring, notifier that feeds the indexers
> - `modules/setting/indexer.go` — `app.ini` configuration loader

## Architecture Overview

```mermaid
graph TD
    subgraph "modules/indexer/internal"
        BaseIface["Indexer interface<br/>Init / Ping / Close"]
    end

    subgraph "Code Indexer (modules/indexer/code)"
        CodeIface["code/internal.Indexer<br/>Index / Delete / Search"]
        CodeBleve["bleve backend"]
        CodeES["elasticsearch backend"]
        GitGrep["gitgrep (fallback, no index)"]
    end

    subgraph "Issue Indexer (modules/indexer/issues)"
        IssueIface["issues/internal.Indexer<br/>Index / Delete / Search"]
        IssueBleve["bleve backend"]
        IssueES["elasticsearch backend"]
        IssueMeili["meilisearch backend"]
        IssueDB["db backend (SQL LIKE)"]
    end

    subgraph "Stats Indexer (modules/indexer/stats)"
        StatsIface["stats.Indexer<br/>Index / Close"]
        StatsDB["DBIndexer (languagestats + go-enry)"]
    end

    BaseIface -.implemented by.-> CodeIface
    BaseIface -.implemented by.-> IssueIface

    CodeIface --> CodeBleve
    CodeIface --> CodeES
    IssueIface --> IssueBleve
    IssueIface --> IssueES
    IssueIface --> IssueMeili
    IssueIface --> IssueDB
    StatsIface --> StatsDB
```

Each indexer family follows the same pattern:

- A **public façade package** (`code`, `issues`, `stats`) exposes `Init`, `Search`/query helpers, and `Update*` functions used by the rest of the app.
- An **`internal` sub-package** defines the actual Go interface (`Indexer`) and the data/search-option structs that are backend-agnostic.
- **Backend sub-packages** (`bleve`, `elasticsearch`, `meilisearch`, `db`) implement that interface.
- A **global atomic pointer** (`globalIndexer atomic.Pointer[internal.Indexer]`) holds whichever backend was configured, initialized lazily at startup, and defaults to a **dummy indexer** that returns "indexer is not ready" errors until the real one finishes initializing. This makes it always safe to dereference `*globalIndexer.Load()`.

## The Base Indexer Interface

`modules/indexer/internal/indexer.go` defines the smallest common contract every backend must satisfy:

```go
// Indexer defines an basic indexer interface
type Indexer interface {
    // Init initializes the indexer
    // returns true if the index was opened/existed (with data populated), false if it was created/not-existed (with no data)
    Init(ctx context.Context) (bool, error)
    // Ping checks if the indexer is available
    Ping(ctx context.Context) error
    // Close closes the indexer
    Close()
}
```

Both the code indexer and the issue indexer embed this base interface and extend it with domain-specific methods:

```go
// modules/indexer/code/internal/indexer.go
type Indexer interface {
    internal.Indexer
    Index(ctx context.Context, repo *repo_model.Repository, sha string, changes *RepoChanges) error
    Delete(ctx context.Context, repoID int64) error
    Search(ctx context.Context, opts *SearchOptions) (int64, []*SearchResult, []*SearchResultLanguages, error)
    SupportedSearchModes() []indexer.SearchMode
}
```

```go
// modules/indexer/issues/internal/indexer.go
type Indexer interface {
    internal.Indexer
    Index(ctx context.Context, issue ...*IndexerData) error
    Delete(ctx context.Context, ids ...int64) error
    Search(ctx context.Context, options *SearchOptions) (*SearchResult, error)
    SupportedSearchModes() []indexer.SearchMode
}
```

Every backend also declares which **search modes** it supports (`exact`, `words`, `fuzzy`, `regexp`) via `SupportedSearchModes()`. These modes are defined once in `modules/indexer/indexer.go`:

| Mode | Constant | Used by |
|------|----------|---------|
| Exact phrase | `SearchModeExact` | all backends |
| Match words (AND of terms) | `SearchModeWords` | all backends |
| Fuzzy | `SearchModeFuzzy` | Bleve code indexer only |
| Regexp | `SearchModeRegexp` | `git grep` fallback only |

`SearchModesExactWords()`, `SearchModesExactWordsFuzzy()`, and `GitGrepSupportedSearchModes()` are convenience helpers that backends call to advertise their capabilities to the UI (search-mode dropdown).

## Code Indexer

Package: `modules/indexer/code`. Public API: `code.Init()`, `code.UpdateRepoIndexer(repo)`, `code.PerformSearch(ctx, opts)`, `code.IsAvailable(ctx)`, `code.SupportedSearchModes()`.

### Backends

| Backend (`REPO_INDEXER_TYPE`) | Package | Storage | Notes |
|---|---|---|---|
| `bleve` (default) | `modules/indexer/code/bleve` | Local Bleve index on disk (`REPO_INDEXER_PATH`, default `indexers/repos.bleve`) | Embedded, no external service required. Supports exact/words/fuzzy modes. |
| `elasticsearch` | `modules/indexer/code/elasticsearch` | Remote ES/OpenSearch cluster (`REPO_INDEXER_CONN_STR`) | Requires a running Elasticsearch (or OpenSearch-compatible) server. |
| *(no index, fallback)* | `modules/indexer/code/gitgrep` | none — shells out to `git grep` | Used automatically whenever `REPO_INDEXER_ENABLED=false`; no persistent index at all. |

There is **no plain "disabled" mode with an error** — when the repo indexer is turned off, Gitea transparently falls back to `git grep` for single-repository code search, at the cost of not being able to search across many repositories at once and not supporting fuzzy search.

`routers/web/repo/search.go` shows this branch explicitly:

```go
if setting.Indexer.RepoIndexerEnabled {
    total, searchResults, searchResultLanguages, err = code_indexer.PerformSearch(ctx, &code_indexer.SearchOptions{...})
    ...
} else {
    searchRef := git.RefNameFromBranch(ctx.Repo.Repository.DefaultBranch)
    searchResults, total, err = gitgrep.PerformSearch(ctx, page, ctx.Repo.Repository.ID, ctx.Repo.GitRepo, searchRef, prepareSearch.Keyword, prepareSearch.SearchMode)
}
```

### Bleve code indexer details (`modules/indexer/code/bleve/bleve.go`)

- Stores one document per file (`RepoIndexerData{RepoID, CommitID, Content, Filename, Language, UpdatedAt}`).
- Custom analyzers: `repoIndexerAnalyzer` (letter tokenizer + Unicode NFC normalize + lowercase) for file content, and `filenameIndexerAnalyzer` (Unicode tokenizer + a custom **path token filter** so that `foo/bar.go` is searchable by path segments) for filenames.
- Uses `enry.GetColor(language)` to attach a display color to each result/language facet, matching GitHub's linguist palette.
- `repoIndexerLatestVersion = 9` — bumped whenever the mapping changes; a version mismatch on disk triggers an automatic rebuild.
- Honors `setting.Indexer.MaxIndexerFileSize` (default 1 MiB) — larger files are deleted from the index rather than indexed, and `setting.Indexer.ExcludeVendored` skips vendor directories using `modules/analyze.IsVendor`.
- File content is fetched with a `git.CatFileBatch` (`gitrepo.NewBatch`) for efficiency instead of one `git show` per file.
- Non-text (binary) files are detected via `typesniffer.DetectContentType(...).IsText()` and indexed with empty `Content` (filename is still searchable).

### Elasticsearch code indexer (`modules/indexer/code/elasticsearch/elasticsearch.go`)

Same `internal.Indexer` contract, backed by the shared `modules/indexer/internal/elasticsearch` low-level ES client wrapper (index creation, bulk operations, query DSL translation). Configured via `REPO_INDEXER_CONN_STR` and `REPO_INDEXER_NAME` (default `gitea_codes`).

### git-grep fallback (`modules/indexer/code/gitgrep/gitgrep.go`)

`PerformSearch` runs `git.GrepSearch` directly against the working tree of the requested ref, translating the shared `SearchModeType` into a `git.GrepMode` (`GrepModeWords`, `GrepModeExact`, `GrepModeRegexp` — this is the **only** backend that supports regexp search). Include/exclude glob patterns from `REPO_INDEXER_INCLUDE`/`REPO_INDEXER_EXCLUDE` are translated into git pathspecs. Because there is no index, pagination is done in-memory after collecting all grep hits, and results are highlighted the same way as indexed results via `code_indexer.HighlightSearchResultCode`.

### Indexing pipeline (repo push → index)

The code indexer processes changes asynchronously through a dedicated queue (`modules/indexer/code/indexer.go`):

```mermaid
sequenceDiagram
    participant Push as git push / repo action
    participant Notifier as services/indexer.indexerNotifier
    participant Queue as code_indexer queue<br/>(queue.WorkerPoolQueue)
    participant Indexer as globalIndexer (Bleve/ES)
    participant Git as git.go helpers
    participant DB as repository / repo_indexer_status

    Push->>Notifier: PushCommits / SyncPushCommits / MigrateRepository / ChangeDefaultBranch
    Notifier->>Queue: code_indexer.UpdateRepoIndexer(repo)
    Queue->>Queue: Push(&IndexerData{RepoID})
    Queue->>Indexer: handler() dequeues IndexerData
    Indexer->>Git: getDefaultBranchSha + getRepoChanges(sha)
    Git->>Git: genesisChanges (ls-tree) or nonGenesisChanges (diff --name-status)
    Git-->>Indexer: RepoChanges{Updates, RemovedFilenames}
    Indexer->>Indexer: Index(ctx, repo, sha, changes)
    Indexer->>DB: UpdateIndexerStatus(repo, CommitSha)
```

Key implementation details:

- The queue is created with `queue.CreateUniqueQueue(ctx, "code_indexer", handler)` — a **unique** queue de-duplicates repeated pushes to the same repo ID while they're still pending.
- `getRepoChanges` (in `modules/indexer/code/git.go`) decides between a **genesis** (full `git ls-tree`) index and an **incremental** (`git diff --name-status` since the last indexed commit) index, tracked per-repo via `repo_model.RepoIndexerStatus` / `UpdateIndexerStatus`.
- If the previously indexed commit no longer exists (e.g., after a force-push), `nonGenesisChanges` deletes the repo's existing documents and falls back to a full genesis re-index.
- `isIndexable()` applies `REPO_INDEXER_INCLUDE` / `REPO_INDEXER_EXCLUDE` glob filters at the tree-entry level before any file is read.
- Which repo *types* get indexed at all is controlled by `REPO_INDEXER_REPO_TYPES` (`sources,forks,mirrors,templates`) — checked early in `index()`.
- On first run (`Init` returns `existed=false`), `populateRepoIndexer` walks the whole `repository` table backwards from the max ID and pushes every unindexed repo into the queue — this is how a brand-new Bleve/ES index gets backfilled.
- `StartupTimeout` (`app.ini` `[indexer] STARTUP_TIMEOUT`, default 30s) bounds how long Gitea will wait for the indexer to finish opening before treating it as failed (`-1` disables the timeout).

## Issue Indexer

Package: `modules/indexer/issues`. Public API: `issues.InitIssueIndexer(syncReindex bool)`, `issues.SearchIssues(ctx, opts)`, `issues.CountIssues(ctx, opts)`, `issues.UpdateIssueIndexer(ctx, id)`, `issues.UpdateRepoIndexer(ctx, repoID)`, `issues.DeleteRepoIssueIndexer(ctx, repoID)`, `issues.IsAvailable(ctx)`.

### Backends

| Backend (`ISSUE_INDEXER_TYPE`) | Package | Storage | Notes |
|---|---|---|---|
| `bleve` (default) | `modules/indexer/issues/bleve` | Local Bleve index (`ISSUE_INDEXER_PATH`, default `indexers/issues.bleve`) | Embedded, no external service. |
| `elasticsearch` | `modules/indexer/issues/elasticsearch` | Remote ES/OpenSearch (`ISSUE_INDEXER_CONN_STR`) | JSON mapping defines `id`, `repo_id`, `title`, `content`, `comments`, plus every filterable field (labels, milestone, assignees, etc.) as `integer`/`boolean`. |
| `meilisearch` | `modules/indexer/issues/meilisearch` | Remote Meilisearch instance (`ISSUE_INDEXER_CONN_STR`, API key parsed out of the URL) | Configures `SearchableAttributes` (`title`, `content`, `comments`) and a long list of `FilterableAttributes`; custom ranking rules put `sort` before `words`/`typo` so explicit sort order isn't overridden by relevance. |
| `db` | `modules/indexer/issues/db` | The primary SQL database itself | No external dependency; issues/comments are searched with `LIKE`/case-insensitive matching via `xorm`. This is also the **safety-net path** used automatically for numeric or empty keywords (see below), regardless of the configured `ISSUE_INDEXER_TYPE`. |

Unlike the code indexer, the issue indexer has **no fallback-on-disabled** concept — one of these four backends is always active (defaulting to `bleve`). However, `SearchIssues` still special-cases the DB backend for reliability:

```go
// modules/indexer/issues/indexer.go
func SearchIssues(ctx context.Context, opts *SearchOptions) ([]int64, int64, error) {
    ix := *globalIndexer.Load()

    if opts.Keyword == "" || opts.IsKeywordNumeric() {
        // Conservative shortcut: use DB directly so newly created issues show up
        // immediately, even if bleve/ES/meilisearch hasn't caught up yet (or is down).
        ix = db.GetIndexer()
    }

    result, err := ix.Search(ctx, opts)
    ...
}
```

This means: even with Elasticsearch/Meilisearch configured, plain listing (no keyword) and searches for an issue number always hit the database directly, sidestepping indexing lag or external-service outages.

### Data model

`modules/indexer/issues/internal/model.go` defines `IndexerData` — the flattened document synced to every backend. It captures searchable text (`Title`, `Content`, `Comments`) and a large set of **filter** fields (`IsPull`, `IsClosed`, `IsArchived`, `LabelIDs`, `MilestoneID`, `ProjectIDs`, `PosterID`, `AssigneeIDs`, `MentionIDs`, `ReviewedIDs`, `ReviewRequestedIDs`, `SubscriberIDs`) plus sort fields (`CreatedUnix`, `UpdatedUnix`, `DeadlineUnix`, `CommentCount`). `SearchOptions` mirrors these as `optional.Option[T]`-based filters, so callers can distinguish "not specified" from "explicitly zero/negative".

### Indexing pipeline

```mermaid
sequenceDiagram
    participant Event as issue/comment/label/PR event
    participant Notifier as services/indexer.indexerNotifier
    participant Queue as issue_indexer queue<br/>(queue.WorkerPoolQueue[*IndexerMetadata])
    participant Indexer as globalIndexer (Bleve/ES/Meili/DB)
    participant DB as models/issues

    Event->>Notifier: NewIssue / IssueChangeStatus / IssueChangeLabels / MergePullRequest / ...
    Notifier->>Queue: issue_indexer.UpdateIssueIndexer(ctx, issueID)
    Queue->>Queue: Push(&IndexerMetadata{ID: issueID})
    Queue->>Indexer: handler dequeues item
    Indexer->>DB: getIssueIndexerData(issueID)
    alt issue exists
        Indexer->>Indexer: Index(ctx, data)
    else issue deleted
        Indexer->>Indexer: Delete(ctx, issueID)
    end
```

Notes:

- `IndexerMetadata{ID, IsDelete, IDs}` is the compact queue payload: either "index this one ID" or "delete this batch of IDs" (`DeleteRepoIssueIndexer` pushes `IsDelete: true` with all issue IDs of a repository).
- `InitIssueIndexer(syncReindex bool)` supports a **synchronous** mode used during `gitea admin reindex` / initial setup — it blocks on `indexerInitWaitChannel` until the backend finishes initializing, instead of just firing a background goroutine.
- Just like the code indexer, first-run population (`PopulateIssueIndexer`) walks all repositories page by page and calls `updateRepoIndexer` for each, which indexes every issue belonging to that repo.
- If Bleve initialization panics (corrupted index files), the issue indexer logs guidance to delete the index directory and falls back to the dummy indexer via `log.Fatal`.

## Repository Stats / Language Indexer

Package: `modules/indexer/stats`. Unlike the other two, this is a much simpler "indexer" — its only backend today is the SQL database (`DBIndexer`), and it exists mainly to run **language detection asynchronously** off of the request path.

```go
// modules/indexer/stats/indexer.go
type Indexer interface {
    Index(id int64) error
    Close()
}
```

- `stats.Init()` creates a dedicated queue (`repo_stats_update`, `queue.WorkerPoolQueue[int64]`) and starts the background populate routine, same "walk repo IDs backwards" pattern as the other indexers.
- `DBIndexer.Index(id)` (in `modules/indexer/stats/db.go`):
  1. Loads the repo, skips if empty.
  2. Reads the previous indexer status (`repo_model.GetIndexerStatus(..., RepoIndexerTypeStats)`); if the current default-branch commit SHA already matches, it's a no-op (avoids recomputation on repeated pushes to a stable HEAD).
  3. Calls `languagestats.GetLanguageStats(gitRepo, commitID)` (`modules/git/languagestats`) to walk the tree and classify each file with **go-enry** (`modules/analyze.GetCodeLanguage`), which tries file extension → filename → content-based heuristics, in that order, and normalizes case-variant language names (`mergeLanguageStats`).
  4. Persists the result with `repo_model.UpdateLanguageStats(repo, commitID, stats)`, which is what renders the colored language bar on the repository page.
- Because the stats queue is also a **unique** queue, redundant pushes for the same repo ID (e.g., rapid successive commits) collapse into one recomputation.

`UpdateRepoIndexer(repo)` is called from the same `services/indexer` notifier hooks as the code indexer — `PushCommits`, `SyncPushCommits`, `MigrateRepository`, `ChangeDefaultBranch` — so language stats always stay in sync with the code index, but stats indexing runs **unconditionally** (it doesn't check `RepoIndexerEnabled`, since it's needed even when full-text code search is off).

## Configuration Reference (`app.ini` `[indexer]`)

Loaded by `modules/setting/indexer.go` (`loadIndexerFrom`). All keys live under the `[indexer]` section.

| Key | Default | Applies to | Description |
|---|---|---|---|
| `ISSUE_INDEXER_TYPE` | `bleve` | issues | `bleve`, `db`, `elasticsearch`, or `meilisearch`. |
| `ISSUE_INDEXER_PATH` | `indexers/issues.bleve` | issues (bleve only) | Path to the local Bleve index; relative paths resolve against `AppWorkPath`. |
| `ISSUE_INDEXER_CONN_STR` | *(empty)* | issues (elasticsearch/meilisearch) | e.g. `http://elastic:password@localhost:9200` or `http://:apikey@localhost:7700`. For Meilisearch, the API key is parsed out of the URL's user-info and stored separately (`ISSUE_INDEXER_CONN_AUTH`, not written back to the URL). |
| `ISSUE_INDEXER_NAME` | `gitea_issues` | issues (elasticsearch/meilisearch) | Index/collection name. |
| `REPO_INDEXER_ENABLED` | `false` | code | Master switch for the code indexer. When `false`, code search transparently falls back to `git grep` (see [gitgrep](#git-grep-fallback-modulesindexercodegitgrepgitgrepgo) above) and no background indexing queue is created. |
| `REPO_INDEXER_REPO_TYPES` | `sources,forks,mirrors,templates` | code | Which repo categories get indexed at all. |
| `REPO_INDEXER_TYPE` | `bleve` | code | `bleve` or `elasticsearch`. |
| `REPO_INDEXER_PATH` | `indexers/repos.bleve` | code (bleve only) | Local Bleve index path. |
| `REPO_INDEXER_CONN_STR` | *(empty)* | code (elasticsearch only) | ES/OpenSearch connection string. |
| `REPO_INDEXER_NAME` | `gitea_codes` | code (elasticsearch only) | Index name. |
| `REPO_INDEXER_INCLUDE` / `REPO_INDEXER_EXCLUDE` | *(empty)* | code | Comma-separated glob patterns (compiled via `GlobMatcherCompile`) controlling which files are indexed/grepped. |
| `REPO_INDEXER_EXCLUDE_VENDORED` | `true` | code | Skip vendored code paths (`modules/analyze.IsVendor`). |
| `MAX_FILE_SIZE` | `1048576` (1 MiB) | code | Files larger than this are removed from the index rather than indexed. |
| `STARTUP_TIMEOUT` | `30s` | all | How long to wait for indexer initialization before failing hard (`-1` disables). |
| `TYPE_BLEVE_MAX_FUZZINESS` | `0` | code (bleve only) | Bleve's fuzzy search has poor performance; fuzziness is disabled (`0`) unless explicitly raised (max `2`). |

> See also: [Configuration Reference](../04-configuration/README.md) for the full `app.ini` layout, and `custom/conf/app.example.ini` (search for `[indexer]`) for the annotated defaults shipped with Gitea.

## Backend Selection & End-to-End Pipeline

The diagram below ties together configuration-driven backend selection with the runtime indexing pipeline, from a repository push down to a search API response.

```mermaid
graph TD
    Config["app.ini [indexer] section"]

    Config -->|REPO_INDEXER_ENABLED=false| GitGrepPath["Code search via git grep<br/>(no index, no queue)"]
    Config -->|REPO_INDEXER_ENABLED=true<br/>REPO_INDEXER_TYPE=bleve| CodeBlevePath["code.Init() → bleve.NewIndexer(RepoPath)"]
    Config -->|REPO_INDEXER_ENABLED=true<br/>REPO_INDEXER_TYPE=elasticsearch| CodeESPath["code.Init() → elasticsearch.NewIndexer(RepoConnStr)"]

    Config -->|ISSUE_INDEXER_TYPE=bleve| IssueBlevePath["issues.InitIssueIndexer() → bleve.NewIndexer(IssuePath)"]
    Config -->|ISSUE_INDEXER_TYPE=elasticsearch| IssueESPath["issues.InitIssueIndexer() → elasticsearch.NewIndexer(IssueConnStr)"]
    Config -->|ISSUE_INDEXER_TYPE=meilisearch| IssueMeiliPath["issues.InitIssueIndexer() → meilisearch.NewIndexer(IssueConnStr)"]
    Config -->|ISSUE_INDEXER_TYPE=db| IssueDBPath["issues.InitIssueIndexer() → db.GetIndexer()"]

    subgraph "Runtime pipeline"
        Push["git push / API action"] --> Notify["services/indexer.indexerNotifier<br/>(registered on notify_service)"]
        Notify --> CodeQueue["code_indexer queue<br/>(unique WorkerPoolQueue)"]
        Notify --> IssueQueue["issue_indexer queue<br/>(unique WorkerPoolQueue)"]
        Notify --> StatsQueue["repo_stats_update queue<br/>(unique WorkerPoolQueue)"]

        CodeQueue --> CodeBackend["globalIndexer (code)<br/>bleve / elasticsearch / dummy"]
        IssueQueue --> IssueBackend["globalIndexer (issues)<br/>bleve / elasticsearch / meilisearch / db"]
        StatsQueue --> StatsBackend["DBIndexer<br/>go-enry language detection"]
    end

    CodeBlevePath --> CodeBackend
    CodeESPath --> CodeBackend
    IssueBlevePath --> IssueBackend
    IssueESPath --> IssueBackend
    IssueMeiliPath --> IssueBackend
    IssueDBPath --> IssueBackend

    CodeBackend --> SearchAPI["Search API / Web UI<br/>code.PerformSearch / issues.SearchIssues"]
    GitGrepPath --> SearchAPI
    IssueBackend --> SearchAPI
```

### Startup and readiness

Regardless of backend, both `code` and `issues` packages:

1. Register a **dummy indexer** in `init()` that always errors with `"indexer is not ready"`, so any early call before startup finishes fails safely instead of panicking.
2. Spawn a goroutine in `Init`/`InitIssueIndexer` that opens the real backend, then atomically swaps it into `globalIndexer` with `globalIndexer.Store(&realIndexer)`.
3. If `Init` (the backend's own initialization, e.g. opening/creating the Bleve index or pinging Elasticsearch) returns `existed == false`, a **population** goroutine backfills the index from the database — this is what makes enabling code/issue search on an existing Gitea instance "just work" without a manual reindex step.
4. Respect `STARTUP_TIMEOUT`: if the backend doesn't finish initializing in time, the process logs a fatal error (or, for the issue indexer's synchronous mode, blocks the boot sequence until either init completes or shutdown is requested).

### Where indexing is triggered from

All the calls into `code_indexer.UpdateRepoIndexer`, `issue_indexer.UpdateIssueIndexer/UpdateRepoIndexer/DeleteRepoIssueIndexer`, and `stats_indexer.UpdateRepoIndexer` are centralized in **`services/indexer/notify.go`**, which registers an `indexerNotifier` (implementing `notify_service.Notifier`) during `services/indexer.Init()` (called from `routers/init.go`). This decouples the indexers from the rest of the codebase — any part of Gitea that triggers a notifier event (push, issue create/close/label/assign, PR merge, repo migrate/delete/rename-default-branch, etc.) automatically keeps all three indexes up to date without those code paths needing direct indexer imports.

## Related Pages

- [Core Modules Overview](README.md)
- [Configuration Reference](../04-configuration/README.md)
- [REST API](../07-rest-api/README.md) — code/issue search endpoints consume `code.PerformSearch` and `issues.SearchIssues`
- [Services Layer](../08-services/README.md) — `services/indexer` notifier wiring
