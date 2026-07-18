# Webhooks & Integrations

Covers Gitea's outgoing webhook system and its integration surfaces with external services and
third-party tools.

Outbound webhooks are Gitea's primary "push" integration mechanism — repository/organization/
system-level event delivery to external URLs, with built-in adapters for Slack, Discord,
Dingtalk, Telegram, MSTeams, Feishu, Matrix, WeChat Work, and Packagist. They share the same
underlying fan-out/notifier infrastructure as the mailer and the in-app notification queue,
which is documented together under **09 · Core Modules**; this section documents the webhook
branch of that pipeline in depth, plus every other way third-party systems integrate with
Gitea (OAuth2 app registration, external issue trackers/wikis, migration downloaders, and
package registry protocols).

## Section Contents

| Page | Description |
|---|---|
| [Webhook Delivery Pipeline](webhook-delivery-pipeline.md) | Event trigger → payload construction → queuing → HTTP delivery, signing headers, and retry/backoff behavior, with a full sequence diagram |
| [Webhook Event Types & Payloads](webhook-event-types-and-payloads.md) | The full `HookEventType` vocabulary, supported webhook target types (Gitea, Slack, Discord, Dingtalk, Telegram, MSTeams, Feishu, Matrix, WeChat Work, Packagist), and every payload JSON schema |
| [Third-Party Integrations](third-party-integrations.md) | OAuth2 application registration (personal/org/instance-wide), external issue tracker & wiki units, repository migration/mirror downloaders, and package registry protocols |
| [Notifications, Mailer & Webhooks](../09-core-modules/notify-mailer-webhook.md) | The broader fan-out architecture — how webhooks relate to the mailer, in-app inbox, and Actions triggers |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the in-app/email notification system | [Notifications](../17-notifications/README.md) |
| See how queued jobs (including webhook delivery) are processed | [Storage, Queue & Caching](../09-core-modules/storage-queue-cache.md) |
| See Actions, which can also emit workflow-triggered notifications | [Actions & CI](../14-actions-ci/README.md) |
| See the full OAuth2 provider flow (Authorization Code + PKCE, grants, scopes) | [Access Tokens & OAuth2 Applications](../11-authentication/tokens-and-oauth-apps.md) |
| See the package registry protocol endpoints in full | [Packages & Actions API](../07-rest-api/packages-and-actions-api.md) |
