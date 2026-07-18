# Database & Models

Documentation of Gitea's database schema, ORM models, and migrations.

Gitea persists all structured data (users, repositories, issues, pull
requests, releases, packages, actions runs, etc.) through the
[xorm](https://xorm.io/) ORM in `models/`, supporting SQLite, MySQL,
PostgreSQL, and MSSQL as interchangeable backends. Schema evolution is handled
by a versioned, ordered list of Go migration functions in
`models/migrations/`. This section documents the DB engine abstraction, the
migration system, the core domain entities (repositories, users/
organizations, issues/pull requests, and the permission model that ties them
together), the many supplementary model packages that round out the schema,
and the fixture-based testing infrastructure that exercises all of it.

## Section Contents

| Page | Description |
|---|---|
| [DB Engine and Drivers](db-engine-and-drivers.md) | The `db.Engine` abstraction, supported drivers (MySQL, PostgreSQL, MSSQL, SQLite via `mattn`/`modernc`), connection setup, and transaction helpers |
| [Database Migrations](migrations.md) | How the ordered migration list works, writing a new migration, and running migrations via CLI |
| [Repository Model](repository-model.md) | The `Repository` entity and satellite models: forks, mirrors, releases, topics, stars/watches, wiki, repo units |
| [Issues & Pull Requests Model](issues-and-pulls-model.md) | `Issue`, `PullRequest`, comments, labels, milestones, and their relationships |
| [User & Organization Model](user-organization-model.md) | `User`, `Team`, `Organization` entities and membership |
| [Permissions Model](permissions-model.md) | Access levels, unit-based permissions, and how they are resolved for a given user/repo/org |
| [Supplementary Models](supplementary-models.md) | Every remaining `models/*` package: keys, avatars, dbfs, projects, secrets, system settings, webhooks, admin tasks, activities, actions, packages, git metadata |
| [Testing & Fixtures](testing-fixtures.md) | The `models/fixtures/` YAML data set, the fixture loader, and the assertion/consistency helpers used by model-layer tests |

## Core Entity Relationships

The diagram below shows how the primary entities documented in this section relate to one
another. It intentionally omits the many supplementary tables covered in
[Supplementary Models](supplementary-models.md) to keep the core relationships readable — see
the individual pages for the full picture of each subsystem (repo units, teams, labels, reviews,
etc.).

```mermaid
erDiagram
    USER ||--o{ REPOSITORY : owns
    USER ||--o{ ORGANIZATION : "member of (via Team)"
    ORGANIZATION ||--o{ TEAM : has
    TEAM ||--o{ USER : "has members"
    TEAM ||--o{ REPOSITORY : "granted access to"
    USER ||--o{ COLLABORATION : "collaborates via"
    COLLABORATION }o--|| REPOSITORY : "grants access to"

    REPOSITORY ||--o{ ISSUE : contains
    REPOSITORY ||--o{ PULLREQUEST : "base/head of"
    REPOSITORY ||--o| REPOSITORY : "forked from (ForkID)"
    REPOSITORY ||--o{ REPOUNIT : "feature units"
    REPOSITORY ||--o{ RELEASE : has

    ISSUE ||--o{ COMMENT : has
    ISSUE ||--o{ LABEL : "tagged with (IssueLabel)"
    ISSUE }o--|| MILESTONE : "belongs to"
    ISSUE ||--o| PULLREQUEST : "is (1:1 when a PR)"

    PULLREQUEST ||--o{ REVIEW : "reviewed via"
    PULLREQUEST }o--|| REPOSITORY : "head repo (fork)"

    USER ||--o{ ACCESS : "cached access mode (per repo)"
    ACCESS }o--|| REPOSITORY : "on repository"

    USER ||--o{ ISSUE : "created by / assigned to"
    USER ||--o{ COMMENT : "authored by"
    USER ||--o{ REVIEW : "reviewed by"

    REPOSITORY {
        int64 ID
        int64 OwnerID
        string Name
        bool IsPrivate
        bool IsFork
    }
    USER {
        int64 ID
        string Name
        string Email
        int Type
    }
    ORGANIZATION {
        int64 ID
        string Name
    }
    TEAM {
        int64 ID
        int64 OrgID
        int AccessMode
    }
    ISSUE {
        int64 ID
        int64 RepoID
        int64 PosterID
        bool IsPull
        bool IsClosed
    }
    PULLREQUEST {
        int64 ID
        int64 IssueID
        int64 BaseRepoID
        int64 HeadRepoID
        int Status
    }
    REVIEW {
        int64 ID
        int64 IssueID
        int64 ReviewerID
        int Type
    }
    COMMENT {
        int64 ID
        int64 IssueID
        int64 PosterID
        int Type
    }
    ACCESS {
        int64 UserID
        int64 RepoID
        int Mode
    }
```

Every arrow above corresponds to a foreign key documented on the respective entity's own page:
`Repository.OwnerID` → `User.ID`, `Issue.RepoID` → `Repository.ID`, `PullRequest.IssueID` →
`Issue.ID` (a `PullRequest` row extends exactly one `Issue` row 1:1), `Review.IssueID` →
`Issue.ID`, and so on. See [Permissions Model](permissions-model.md) for how the `Access` cache
table and `Team`/`TeamUnit` grants are actually resolved into an effective per-request
`Permission`.

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See how a request reaches a model | [Request Lifecycle](../02-architecture/request-lifecycle.md) |
| See the package registry's own tables | [Packages & Registry: Database Schema](../15-packages-registry/database-schema.md) |
| See how permissions gate HTTP routes | [Web Router & Server-Rendered UI](../06-web-routers/web-routes.md) |
| See the full Actions/CI run-job-step state machine | [Actions & CI: Actions Architecture](../14-actions-ci/actions-architecture.md) |
| See the webhook delivery pipeline built on `models/webhook` | [Webhooks & Integrations](../16-webhooks-integrations/webhook-delivery-pipeline.md) |
| Write or run a model-layer unit test | [Testing & Fixtures](testing-fixtures.md) |
