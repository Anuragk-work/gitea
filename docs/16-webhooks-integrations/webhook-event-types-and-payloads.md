# Webhook Event Types & Payloads

This page documents Gitea's outgoing-webhook event vocabulary (`HookEventType`), how a
webhook's subscription to a subset of events is modeled, and the exact JSON payload schema
sent for each event family. It is verified against `modules/webhook/type.go`,
`modules/webhook/events.go`, `models/webhook/webhook.go`, and `modules/structs/hook.go`.

## Event types (`HookEventType`)

`modules/webhook/type.go` defines every event a webhook can subscribe to:

```go
type HookEventType string

const (
    HookEventCreate                    HookEventType = "create"
    HookEventDelete                    HookEventType = "delete"
    HookEventFork                      HookEventType = "fork"
    HookEventPush                      HookEventType = "push"
    HookEventIssues                    HookEventType = "issues"
    HookEventIssueAssign               HookEventType = "issue_assign"
    HookEventIssueLabel                HookEventType = "issue_label"
    HookEventIssueMilestone            HookEventType = "issue_milestone"
    HookEventIssueComment              HookEventType = "issue_comment"
    HookEventPullRequest               HookEventType = "pull_request"
    HookEventPullRequestAssign         HookEventType = "pull_request_assign"
    HookEventPullRequestLabel          HookEventType = "pull_request_label"
    HookEventPullRequestMilestone      HookEventType = "pull_request_milestone"
    HookEventPullRequestComment        HookEventType = "pull_request_comment"
    HookEventPullRequestReviewApproved HookEventType = "pull_request_review_approved"
    HookEventPullRequestReviewRejected HookEventType = "pull_request_review_rejected"
    HookEventPullRequestReviewComment  HookEventType = "pull_request_review_comment"
    HookEventPullRequestSync           HookEventType = "pull_request_sync"
    HookEventPullRequestReviewRequest  HookEventType = "pull_request_review_request"
    HookEventWiki                      HookEventType = "wiki"
    HookEventRepository                HookEventType = "repository"
    HookEventRelease                   HookEventType = "release"
    HookEventPackage                   HookEventType = "package"
    HookEventStatus                    HookEventType = "status"

    HookEventPullRequestReview HookEventType = "pull_request_review" // grouping value, see below

    // Actions event only
    HookEventSchedule    HookEventType = "schedule"
    HookEventWorkflowRun HookEventType = "workflow_run"
    HookEventWorkflowJob HookEventType = "workflow_job"
)
```

`AllEvents()` returns the flat list used to populate "Send Everything" and the individual event
checkboxes in the webhook settings UI/API. Several of these are **sub-events** that share a
payload shape with a "parent" event but exist so the UI can offer more granular triggers (e.g.
"only notify when an issue is assigned" vs. "notify for every issue change"). `Event()`
collapses a `HookEventType` down to the normalized event name used in HTTP headers and in
`payloadConvertor` dispatch:

| Group | Member `HookEventType`s | Collapses to (`Event()`) |
|---|---|---|
| Issues | `issues`, `issue_assign`, `issue_label`, `issue_milestone` | `issues` |
| Pull request | `pull_request`, `pull_request_assign`, `pull_request_label`, `pull_request_milestone`, `pull_request_sync`, `pull_request_review_request` | `pull_request` |
| Issue/PR comments | `issue_comment`, `pull_request_comment` | `issue_comment` |
| PR review — approved | `pull_request_review_approved` | `pull_request_approved` |
| PR review — rejected | `pull_request_review_rejected` | `pull_request_rejected` |
| PR review — comment | `pull_request_review_comment` | `pull_request_comment` |
| Everything else | `create`, `delete`, `fork`, `push`, `wiki`, `repository`, `release`, `package`, `status`, `workflow_run`, `workflow_job` | itself |

`IsPullRequest()` reports whether `Event()` resolves to `"pull_request"`.
`IsPullRequestReview()` specifically flags the three review sub-events
(`pull_request_review_approved/rejected/comment`), which — despite being reported with distinct
event names — all reuse `PullRequestPayload` as their JSON body (see `Review()` in the
`payloadConvertor` interface).

`schedule`, `workflow_run`, and `workflow_job` are **Actions-only** events: they are not fired
by the generic outgoing-webhook subsystem for repo/org/system webhooks in the same way as the
others, but are used internally to detect and re-trigger Actions workflows
(`services/actions/notifier.go`) and are documented here because they share the same
`HookEventType` vocabulary and, for `workflow_run`/`workflow_job`, can also be delivered as
outgoing webhooks if a webhook subscribes to them.

## Supported webhook types (`HookType`)

Alongside the generic Gitea-format JSON, `modules/webhook/type.go` defines the vendor-specific
target formats a `Webhook` row's `Type` can select:

```go
type HookType = string

const (
    GITEA      HookType = "gitea"
    GOGS       HookType = "gogs"
    SLACK      HookType = "slack"
    DISCORD    HookType = "discord"
    DINGTALK   HookType = "dingtalk"
    TELEGRAM   HookType = "telegram"
    MSTEAMS    HookType = "msteams"
    FEISHU     HookType = "feishu"
    MATRIX     HookType = "matrix"
    WECHATWORK HookType = "wechatwork"
    PACKAGIST  HookType = "packagist"
)
```

`setting.Webhook.Types` (`modules/setting/webhook.go`) exposes this same list to the "Add
Webhook" UI. Each non-`gitea`/`gogs` type has its own file under `services/webhook/` that
implements the `payloadConvertor[T]` interface (`Create`, `Delete`, `Fork`, `Issue`,
`IssueComment`, `Push`, `PullRequest`, `Review`, `Repository`, `Release`, `Wiki`, `Package`,
`Status`, `WorkflowRun`, `WorkflowJob` — see `services/webhook/payloader.go`) and registers a
`Requester` function via `RegisterWebhookRequester(hookType, requester)` in an `init()`. The
`Requester` transforms the stored generic Gitea payload into that target's native wire format
at delivery time (see
[Webhook Delivery Pipeline](webhook-delivery-pipeline.md#step-56-the-sending-queue-and-deliver)).

| Type | Convertor file | Delivery shape | Per-webhook `Meta` fields (stored as JSON in `Webhook.Meta`) |
|---|---|---|---|
| `gitea` / `gogs` | *(none — `newDefaultRequest` in `deliver.go`)* | Raw Gitea-format JSON (or form-encoded `payload=` field if `ContentType` is form), sent as-is with the full signature/identification headers | — |
| `slack` | `services/webhook/slack.go` | Slack "incoming webhook" JSON: `{channel, text, username, icon_url, attachments}` | `channel`, `username`, `icon_url`, `color` (`SlackMeta`) |
| `discord` | `services/webhook/discord.go` | Discord webhook JSON: `{content, username, avatar_url, embeds: [...]}` with rich embed fields (title/description/color/footer/author/fields), colored per event type/action | `username`, `icon_url` (`DiscordMeta`) |
| `dingtalk` | `services/webhook/dingtalk.go` | DingTalk "ActionCard" JSON via the `gitea.com/lunny/dingtalk_webhook` payload shape | — (URL itself embeds the DingTalk access token) |
| `telegram` | `services/webhook/telegram.go` | Telegram Bot API `sendMessage` JSON (`chat_id`, `text`, parse mode) | `bot_token`, `chat_id` (`TelegramMeta`) |
| `msteams` | `services/webhook/msteams.go` | Office 365 Connector "MessageCard" JSON (`@type`, `@context`, `themeColor`, `sections` with `activityTitle`/`activitySubtitle`/`activityImage`/facts) | — |
| `feishu` | `services/webhook/feishu.go` | Feishu/Lark custom-bot webhook JSON (text-card message) | — (URL embeds the Feishu bot webhook token) |
| `matrix` | `services/webhook/matrix.go` | Matrix Client-Server `PUT /_matrix/.../send/m.room.message/{txnId}` — payload is `{body, msgtype, format, formatted_body, "io.gitea.commits"}`; uses `HTTPMethod = PUT` and a transaction ID derived from the payload body | `homeserver_url`, `room_id`, `message_type` (`1` = `m.notice`, `2` = `m.text`) (`MatrixMeta`) |
| `wechatwork` | `services/webhook/wechatwork.go` | WeChat Work group-robot "markdown" message JSON | — (URL embeds the WeChat Work robot key) |
| `packagist` | `services/webhook/packagist.go` | Packagist "update package" JSON (`{repository: {url}}`), used to trigger a Packagist re-scan after a push | `username`, `api_token`, `package_url` (`PackagistMeta`) |

Every type still passes through the same gating (`PrepareWebhook`), queuing (`hookQueue`), and
signature/identification header logic (`addDefaultHeaders`) described in
[Webhook Delivery Pipeline](webhook-delivery-pipeline.md) — only the JSON/HTTP-method shape of
the final request body differs. `IsValidHookTaskType(name)` (`services/webhook/webhook.go`)
validates a `Type` string against `GITEA`/`GOGS` plus every type with a registered `Requester`,
used when validating `CreateHookOption.Type` on the REST API.

Matrix is notable for using `HTTPMethod = PUT` with a URL path segment (the Matrix "transaction
ID", derived deterministically from a hash of the payload body via `getMatrixTxnID`) rather than
a plain `POST` — `newDefaultRequest`'s `switch w.HTTPMethod` branch has a dedicated case for
`MATRIX` to reconstruct this URL shape when replaying a `PayloadVersion == 1` legacy task.

## Subscribing a webhook to events (`HookEvent`)

A `Webhook` row's subscription is stored as JSON in its `Events` column and unmarshaled into
`*webhook_module.HookEvent` on load (`Webhook.AfterLoad`):

```go
// modules/webhook/events.go
type HookEvents map[HookEventType]bool

type HookEvent struct {
    PushOnly       bool   `json:"push_only"`
    SendEverything bool   `json:"send_everything"`
    ChooseEvents   bool   `json:"choose_events"`
    BranchFilter   string `json:"branch_filter"`

    HookEvents `json:"events"`
}
```

`Webhook.HasEvent(evt)` is the single gate consulted by `PrepareWebhook` (see
[Webhook Delivery Pipeline](webhook-delivery-pipeline.md#step-4-webhook-matching--gating-preparewebhooks--preparewebhook)):

```go
func (w *Webhook) HasEvent(evt webhook_module.HookEventType) bool {
    if w.SendEverything {
        return true
    }
    if w.PushOnly {
        return evt == webhook_module.HookEventPush
    }
    checkEvt := evt
    switch evt {
    case webhook_module.HookEventPullRequestReviewApproved,
        webhook_module.HookEventPullRequestReviewRejected,
        webhook_module.HookEventPullRequestReviewComment:
        checkEvt = webhook_module.HookEventPullRequestReview
    }
    return w.HookEvents[checkEvt]
}
```

Note the special-case remap for the three PR-review sub-events: the webhook settings UI exposes
a single "Pull Request Review" checkbox (`HookEventPullRequestReview`) rather than three
separate ones, so `HasEvent` normalizes any of the three concrete review events back to that
one key before checking the persisted `HookEvents` map. `BranchFilter` (a glob, e.g. `main` or
`release/*`) additionally restricts delivery to ref-bearing events (`push`, `create`, `delete`)
whose ref matches the pattern — see `checkBranchFilter` in
[Webhook Delivery Pipeline](webhook-delivery-pipeline.md).

`EventsArray()` is the reverse projection — turning the stored subscription back into a flat
list of event-name strings, used when serializing a `Webhook` for the REST API (`api.Hook`).

## Payload schemas (`modules/structs/hook.go`)

Every outgoing webhook payload implements:

```go
type Payloader interface {
    JSONPayload() ([]byte, error)
}
```

All payload structs are marshaled with two-space-indented JSON
(`json.MarshalIndent(p, "", "  ")`). The table below is the authoritative mapping from event to
payload type; see [Webhook Delivery Pipeline](webhook-delivery-pipeline.md) for how the
generic Gitea-format JSON below gets reshaped for chat-oriented webhook types at delivery time.

| Event(s) | Payload type | Notes |
|---|---|---|
| `create` | `CreatePayload` | Branch or tag created |
| `delete` | `DeletePayload` | Branch or tag deleted |
| `fork` | `ForkPayload` | Also indirectly triggers a `repository` "created" event if the fork target is an org |
| `push` | `PushPayload` | |
| `issues`, `issue_assign`, `issue_label`, `issue_milestone` | `IssuePayload` | |
| `issue_comment`, `pull_request_comment` | `IssueCommentPayload` | Same payload type serves comments on both issues and PRs; `IsPull` / presence of `PullRequest` disambiguates |
| `pull_request`, `pull_request_assign`, `pull_request_label`, `pull_request_milestone`, `pull_request_sync`, `pull_request_review_request` | `PullRequestPayload` | |
| `pull_request_review_approved`, `pull_request_review_rejected`, `pull_request_review_comment` | `PullRequestPayload` | Delivered via the `Review()` method of `payloadConvertor`, distinguished by `event`/`Action`, not a distinct payload struct |
| `wiki` | `WikiPayload` | |
| `repository` | `RepositoryPayload` | |
| `release` | `ReleasePayload` | |
| `package` | `PackagePayload` | |
| `status` | `CommitStatusPayload` | |
| `workflow_run` | `WorkflowRunPayload` | Actions |
| `workflow_job` | `WorkflowJobPayload` | Actions |

### `CreatePayload` / `DeletePayload`

```go
type CreatePayload struct {
    Sha     string      `json:"sha"`
    Ref     string      `json:"ref"`
    RefType string      `json:"ref_type"` // "branch" or "tag"
    Repo    *Repository `json:"repository"`
    Sender  *User       `json:"sender"`
}

type DeletePayload struct {
    Ref        string      `json:"ref"`
    RefType    string      `json:"ref_type"`
    PusherType PusherType  `json:"pusher_type"` // "user"
    Repo       *Repository `json:"repository"`
    Sender     *User       `json:"sender"`
}
```

### `ForkPayload`

```go
type ForkPayload struct {
    Forkee *Repository `json:"forkee"` // the original repo that was forked
    Repo   *Repository `json:"repository"` // the new fork
    Sender *User       `json:"sender"`
}
```

### `PushPayload`

```go
type PushPayload struct {
    Ref          string           `json:"ref"`
    Before       string           `json:"before"`
    After        string           `json:"after"`
    CompareURL   string           `json:"compare_url"`
    Commits      []*PayloadCommit `json:"commits"`
    TotalCommits int              `json:"total_commits"`
    HeadCommit   *PayloadCommit   `json:"head_commit"`
    Repo         *Repository      `json:"repository"`
    Pusher       *User            `json:"pusher"`
    Sender       *User            `json:"sender"`
}

type PayloadCommit struct {
    ID           string                      `json:"id"`
    Message      string                      `json:"message"`
    URL          string                      `json:"url"`
    Author       *PayloadUser                `json:"author"`
    Committer    *PayloadUser                `json:"committer"`
    Verification *PayloadCommitVerification  `json:"verification"`
    Timestamp    time.Time                   `json:"timestamp"`
    Added        []string                    `json:"added"`
    Removed      []string                    `json:"removed"`
    Modified     []string                    `json:"modified"`
}
```

`ParsePushHook(raw)` is the corresponding decoder used when Gitea itself needs to parse a
Gitea/Gogs-formatted push payload (e.g. Actions' internal event matching); it rejects payloads
missing `Repo` or `Ref` as `ErrInvalidReceiveHook`, guarding against payloads that superficially
parse as JSON but didn't actually originate from a Gitea-compatible push event. `Branch()`
strips the `refs/heads/` prefix from `Ref` for convenience.

### `IssuePayload` / `PullRequestPayload` and `HookIssueAction`

Both issue and pull-request lifecycle events share the same **action vocabulary**,
`HookIssueAction`:

```go
const (
    HookIssueOpened               HookIssueAction = "opened"
    HookIssueClosed               HookIssueAction = "closed"
    HookIssueReOpened             HookIssueAction = "reopened"
    HookIssueEdited               HookIssueAction = "edited"
    HookIssueDeleted              HookIssueAction = "deleted"
    HookIssueAssigned             HookIssueAction = "assigned"
    HookIssueUnassigned           HookIssueAction = "unassigned"
    HookIssueLabelUpdated         HookIssueAction = "label_updated"
    HookIssueLabelCleared         HookIssueAction = "label_cleared"
    HookIssueSynchronized         HookIssueAction = "synchronized"
    HookIssueMilestoned           HookIssueAction = "milestoned"
    HookIssueDemilestoned         HookIssueAction = "demilestoned"
    HookIssueReviewed             HookIssueAction = "reviewed"
    HookIssueReviewRequested      HookIssueAction = "review_requested"
    HookIssueReviewRequestRemoved HookIssueAction = "review_request_removed"
)
```

```go
type IssuePayload struct {
    Action     HookIssueAction `json:"action"`
    Index      int64           `json:"number"`
    Changes    *ChangesPayload `json:"changes,omitempty"`
    Issue      *Issue          `json:"issue"`
    Repository *Repository     `json:"repository"`
    Sender     *User           `json:"sender"`
    CommitID   string          `json:"commit_id"`
}

type PullRequestPayload struct {
    Action            HookIssueAction `json:"action"`
    Before            string          `json:"before,omitempty"`
    After             string          `json:"after,omitempty"`
    Index             int64           `json:"number"`
    Changes           *ChangesPayload `json:"changes,omitempty"`
    PullRequest       *PullRequest    `json:"pull_request"`
    RequestedReviewer *User           `json:"requested_reviewer"`
    Repository        *Repository     `json:"repository"`
    Sender            *User           `json:"sender"`
    CommitID          string          `json:"commit_id"`
    Review            *ReviewPayload  `json:"review"`
}

type ReviewPayload struct {
    Type    string `json:"type"`    // e.g. "pull_request_review_approved"
    Content string `json:"content"` // the review's top-level comment body
}

type ChangesPayload struct {
    Title         *ChangesFromPayload `json:"title,omitempty"`
    Body          *ChangesFromPayload `json:"body,omitempty"`
    Ref           *ChangesFromPayload `json:"ref,omitempty"`
    AddedLabels   []*Label            `json:"added_labels"`
    RemovedLabels []*Label            `json:"removed_labels"`
}

type ChangesFromPayload struct {
    From string `json:"from"` // the previous value before the edit
}
```

`Changes` is only populated for `edited`-style actions and only includes the fields that
actually changed (`Title`/`Body`/`Ref` are `nil` if unchanged). `Review` is only populated for
the PR-review sub-events. `RequestedReviewer` is only populated for
`pull_request_review_request`/`pull_request_review_request_removed`.

### `IssueCommentPayload`

```go
type IssueCommentPayload struct {
    Action      HookIssueCommentAction `json:"action"` // "created" | "edited" | "deleted"
    Issue       *Issue                 `json:"issue"`
    PullRequest *PullRequest           `json:"pull_request,omitempty"`
    Comment     *Comment               `json:"comment"`
    Changes     *ChangesPayload        `json:"changes,omitempty"`
    Repository  *Repository            `json:"repository"`
    Sender      *User                  `json:"sender"`
    IsPull      bool                   `json:"is_pull"`
}
```

The same struct backs comments on both issues and pull requests — `IsPull`/the presence of a
non-nil `PullRequest` field is how a receiver distinguishes the two, since GitHub-compatible
tooling expects `pull_request` to be present only for PR comments.

### `WikiPayload`

```go
type WikiPayload struct {
    Action     HookWikiAction `json:"action"` // "created" | "edited" | "deleted"
    Repository *Repository    `json:"repository"`
    Sender     *User          `json:"sender"`
    Page       string         `json:"page"`
    Comment    string         `json:"comment"`
}
```

### `RepositoryPayload`

```go
type RepositoryPayload struct {
    Action       HookRepoAction `json:"action"` // "created" | "deleted"
    Repository   *Repository    `json:"repository"`
    Organization *User          `json:"organization"`
    Sender       *User          `json:"sender"`
}
```

### `ReleasePayload`

```go
type ReleasePayload struct {
    Action     HookReleaseAction `json:"action"` // "published" | "updated" | "deleted"
    Release    *Release          `json:"release"`
    Repository *Repository       `json:"repository"`
    Sender     *User             `json:"sender"`
}
```

### `PackagePayload`

```go
type PackagePayload struct {
    Action       HookPackageAction `json:"action"` // "created" | "deleted"
    Repository   *Repository       `json:"repository"`
    Package      *Package          `json:"package"`
    Organization *Organization     `json:"organization"`
    Sender       *User             `json:"sender"`
}
```

### `CommitStatusPayload`

```go
type CommitStatusPayload struct {
    Commit      *PayloadCommit `json:"commit"`
    Context     string         `json:"context"`
    CreatedAt   time.Time      `json:"created_at"`
    Description string         `json:"description"`
    ID          int64          `json:"id"`
    Repo        *Repository    `json:"repository"`
    Sender      *User          `json:"sender"`
    SHA         string         `json:"sha"`
    State       string         `json:"state"` // pending | success | error | failure
    TargetURL   string         `json:"target_url"`
    UpdatedAt   *time.Time     `json:"updated_at"`
}
```

### `WorkflowRunPayload` / `WorkflowJobPayload` (Actions)

```go
type WorkflowRunPayload struct {
    Action       string              `json:"action"`
    Workflow     *ActionWorkflow     `json:"workflow"`
    WorkflowRun  *ActionWorkflowRun  `json:"workflow_run"`
    PullRequest  *PullRequest        `json:"pull_request,omitempty"`
    Organization *Organization       `json:"organization,omitempty"`
    Repo         *Repository         `json:"repository"`
    Sender       *User               `json:"sender"`
}

type WorkflowJobPayload struct {
    Action       string              `json:"action"`
    WorkflowJob  *ActionWorkflowJob  `json:"workflow_job"`
    PullRequest  *PullRequest        `json:"pull_request,omitempty"`
    Organization *Organization       `json:"organization,omitempty"`
    Repo         *Repository         `json:"repository"`
    Sender       *User               `json:"sender"`
}
```

Two related payload types exist for Actions but are **not** delivered as outgoing webhooks —
they are internal-only, consumed directly by the Actions engine rather than serialized to an
external endpoint:

```go
// WorkflowDispatchPayload — synthesized for a manual "Run workflow" dispatch
type WorkflowDispatchPayload struct {
    Workflow   string         `json:"workflow"`
    Ref        string         `json:"ref"`
    Inputs     map[string]any `json:"inputs"`
    Repository *Repository    `json:"repository"`
    Sender     *User          `json:"sender"`
}

// WorkflowCallPayload — persisted on a reusable-workflow caller job's CallPayload field
type WorkflowCallPayload struct {
    Workflow   string         `json:"workflow"`
    Ref        string         `json:"ref"`
    Inputs     map[string]any `json:"inputs"`
    Repository *Repository    `json:"repository"`
    Sender     *User          `json:"sender"`
}
```

See [Actions & CI](../14-actions-ci/README.md) for how these drive workflow execution.

### Shared building blocks

- `PayloadUser{Name, Email, UserName}` — a lightweight commit author/committer representation
  distinct from the full API `User` struct (used only inside `PayloadCommit`).
- `PayloadCommitVerification{Verified, Reason, Signature, Signer, Payload}` — GPG/SSH commit
  signature verification metadata attached to each `PayloadCommit`.
- `Repository`, `User`, `Organization`, `Issue`, `PullRequest`, `Comment`, `Label`, `Release`,
  `Package` — the same full API representations used throughout the REST API (see
  [REST API](../07-rest-api/README.md)), reused verbatim as the nested objects inside webhook
  payloads so that anything a client already knows how to parse from `GET
  /repos/{owner}/{repo}` also applies to a webhook's `repository` field, etc.

## Related pages

* [Webhook Delivery Pipeline](webhook-delivery-pipeline.md) — how these events are triggered,
  gated, queued, and delivered, including retry/backoff behavior
* [Third-Party Integrations](third-party-integrations.md) — OAuth2 app registration and other
  external-facing integration surfaces
* [REST API](../07-rest-api/README.md) — the `Hook`/`CreateHookOption`/`EditHookOption`
  structs used to manage webhooks, and the full API object schemas reused inside payloads
* [Notifications, Mailer & Webhooks](../09-core-modules/notify-mailer-webhook.md) — where each
  event is actually raised from business logic
