# Contributing & Development

Guidelines and workflows for contributing code and documentation to Gitea.

This section documents the end-to-end contributor experience for the Gitea
project: how to fork, branch, and submit a pull request; the backend and
frontend coding conventions enforced by CI; AI-assisted contribution policy;
the refactoring policy; how releases are versioned and shipped; how the
project is governed and how security issues are reported; and the issue/PR
templates and bot automation that keep the tracker consistent.

- [Contribution Workflow & Governance](contribution-workflow.md) — the
  entry-point page: fork → patch → push → PR workflow, backend/frontend
  guidelines summary, refactoring guidelines, release management &
  versioning, and community governance / maintainer structure, with pointers
  to the dedicated pages below for full detail.
- [AI-Assisted Contributions](ai-assisted-contributions.md) — the human-facing
  AI contribution policy from `CONTRIBUTING.md`, cross-referenced against the
  machine-facing agent conventions in the repository's root `AGENTS.md` /
  `CLAUDE.md` files.
- [Backend Coding Conventions](backend-coding-conventions.md) — the full
  backend package-layering rule, XORM/transaction guidance, Go module
  hygiene, and API v1 conventions from `docs/guidelines-backend.md`.
- [Frontend Coding Conventions](frontend-coding-conventions.md) — the full
  Vue/Fomantic-UI/Tailwind framework-usage rules, CSS/TypeScript linter
  configuration, and DOM/data-fetching helpers from `docs/guidelines-frontend.md`.
- [Governance & Security](governance-and-security.md) — the full review,
  label, merge-queue, and maintainer/TOC governance process from
  `docs/community-governance.md`, plus the vulnerability-reporting process
  from `SECURITY.md`.
- [Issue & PR Templates and Automation](issue-pr-templates-and-automation.md) —
  every issue form under `.github/ISSUE_TEMPLATE/`, the PR template, and the
  label/bot automation (`labeler.yml`, `pull-labeler.yml`, `giteabot.yml`,
  `giteabot-backport.yml`) that acts on them.
