=== FILE: docs/17-notifications/README.md ===
=== METADATA: format=md ===
[SUMMARY] # Notifications Documentation of Gitea's notification system, including email and in-app alerts. In-app notifications, email notifications (via the mailer), outbound webhooks, and Gitea Actions triggers all funnel through the same fan-out abstraction: `notify.Notifier` in `services/notify/`. A single domain event — a new issue comment, a pull request review, or an `@mention` — is dispatched once and consumed independently by every registered notifier.

# Notifications

Documentation of Gitea's notification system, including email and in-app alerts.

In-app notifications, email notifications (via the mailer), outbound webhooks, and Gitea
Actions triggers all funnel through the same fan-out abstraction: `notify.Notifier` in
`services/notify/`. A single domain event — a new issue comment, a pull request review, or an
`@mention` — is dispatched once and consumed independently by every registered notifier.

## Section Contents

| Page | Description |
|---|---|
| [Notification Delivery & UI Notifications](notification-delivery-and-uinotification.md) | The `notify.Notifier` fan-out pattern, three concrete triggering events (new comment, PR review, `@mention`), a full Mermaid diagram from trigger to every downstream consumer, and the in-app notification inbox + Server-Sent Events badge pipeline |
| [Email Notification Templates](email-notification-templates.md) | The `templates/mail/` directory layout, template resolution/fallback logic, message composition (rendering, threading headers, reply-by-email), recipient selection, and the async mail queue/transport in `services/mailer` |
| [Notifications, Mailer & Webhooks (full reference)](../09-core-modules/notify-mailer-webhook.md) | The exhaustive reference: full `Notifier` interface, every registered notifier, the webhook data model, and Actions trigger guard logic |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See webhook-specific integration details | [Webhooks & Integrations](../16-webhooks-integrations/README.md) |
| See how notifications are queued/cached | [Storage, Queue & Caching](../09-core-modules/storage-queue-cache.md) |
| See mailer-related `app.ini` settings | [Settings Catalog](../04-configuration/settings-catalog.md) |
