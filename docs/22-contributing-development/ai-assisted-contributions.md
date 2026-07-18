# AI-Assisted Contributions

Gitea explicitly welcomes AI-assisted contributions — both from human contributors
who use AI tools to help write code, and from autonomous coding agents operating
inside this repository — but both are held to the same responsibility standard as
any other contribution. This page consolidates the **human-facing policy** in
[`CONTRIBUTING.md`](https://github.com/go-gitea/gitea/blob/main/CONTRIBUTING.md#ai-contribution-policy)
with the **machine-facing conventions** in the repository's root
[`AGENTS.md`](https://github.com/go-gitea/gitea/blob/main/AGENTS.md) and
[`CLAUDE.md`](https://github.com/go-gitea/gitea/blob/main/CLAUDE.md) files.

## 1. The human-facing policy (`CONTRIBUTING.md`)

`CONTRIBUTING.md`'s "AI Contribution Policy" section states the rules that apply to
every contributor, regardless of which tool (if any) they used:

1. **Review closely.** Review AI-generated code closely before marking a pull
   request ready for review.
2. **Test manually.** Manually test the changes and add appropriate automated
   tests where feasible.
3. **Understand what you submit.** Only use AI to assist in contributions you
   understand well enough to explain, defend, and revise yourself during review.
4. **Disclose.** Disclose AI-assisted content clearly — in the PR description or
   issue body, not buried in a commit trailer only.
5. **Don't outsource the conversation.** Do not use AI to reply to reviewer
   questions about your issue or pull request. Those questions are directed at
   *you*, not a model.
6. **Drafting is fine, accountability isn't optional.** AI may help draft issues
   and pull requests, but the contributor remains responsible for the accuracy,
   completeness, and intent of what they submit.

Maintainers reserve the right to close pull requests and issues that:

- do not disclose AI assistance,
- appear to be low-quality AI-generated content, or
- were submitted by a contributor who cannot explain or defend the proposed
  change themselves.

> [!NOTE]
> The project's own framing is explicit about the trade-off it is trying to
> avoid: *"We welcome new contributors, but cannot sustain the effort of
> supporting contributors who primarily defer to AI rather than engaging
> substantively with the review process."* AI assistance is a tool for producing
> a contribution the human still owns — not a substitute for review engagement.

This policy applies uniformly to issues, PR descriptions, code changes, and
review replies; there is no separate, looser policy for small changes.

## 2. The machine-facing conventions (`AGENTS.md` / `CLAUDE.md`)

`AGENTS.md` (at the repository root) is the operational rulebook that a coding
agent working directly in this repository is expected to follow. `CLAUDE.md`
does not duplicate it — it is a single-line pointer:

```markdown
@AGENTS.md
```

This means any agent tooling that reads `CLAUDE.md` inherits `AGENTS.md` verbatim;
the two files are kept in sync by construction rather than by convention, so there
is no drift risk between them as long as `CLAUDE.md` keeps referencing `AGENTS.md`
instead of forking its own copy.

`AGENTS.md` covers four broad areas:

### Build, lint, and test commands

| Rule | Command / note |
|---|---|
| Discover available targets | `make help` |
| Format Go files | `make fmt` |
| Lint Go files | `make lint-go` |
| Lint TypeScript files | `make lint-js` |
| Sync Go modules after `go.mod` changes | `make tidy` |
| Run a single Go test | `go test -run '^TestName$' ./modulepath/` |
| Run a single JS/TS test file | `pnpm exec vitest <path-filter>` |
| Run a single Playwright e2e test file | `GITEA_TEST_E2E_FLAGS='<filepath>' make test-e2e` |

These are strict aliases of the broader targets documented in
[Makefile & Build System](../build-cicd-deployment/makefile-and-build.md) and
[Unit, Integration, E2E & Fuzz Testing](../21-testing-quality/unit-integration-e2e-fuzz.md) —
an agent is expected to use the narrowest command that answers its immediate
question (a single test) rather than re-running the full suite for every change.

### Code style and content rules

- Add the current year to the copyright header of new `.go` files (see
  [Copyright header](contribution-workflow.md#copyright-header)).
- Ensure no trailing whitespace in edited files.
- Preserve existing code comments — do not remove or rewrite comments that are
  still relevant.
- Keep comments short, prefer same-line, explain *why*, never narrate *what* the
  code already says.
- In TypeScript, use `!` (non-null assertion) instead of `?.`/`??` when a value is
  known to always exist — matching
  [Frontend Coding Conventions](frontend-coding-conventions.md#typescript-conventions).
- For CSS layout, prefer `flex-*` helpers over per-child `tw-ml-*` / `tw-mr-*`
  margins; fall back to `tw-*` utilities when specificity requires `!important` —
  matching [Frontend Coding Conventions](frontend-coding-conventions.md#css-conventions).
- Prefer unit tests over integration tests when the logic under test is testable
  in isolation.
- Aim for sub-2-second local runtime for integration and e2e tests added or
  modified by an agent.

### Commit and PR conventions

- Use [Conventional Commits](https://www.conventionalcommits.org/) for both
  commit messages and PR titles: `type(scope): subject`, with `!` before the
  colon for a breaking change. Use the `test` type for test-only changes. This is
  the same taxonomy documented in
  [PR titles (Conventional Commits)](contribution-workflow.md#pr-titles-conventional-commits).
- **Never force-push, amend, or squash** unless explicitly asked. Use new commits
  and a normal push for pull request updates — this deliberately preserves the
  reviewer's ability to see incremental changes, matching the human-facing rule
  in [`CONTRIBUTING.md`](https://github.com/go-gitea/gitea/blob/main/CONTRIBUTING.md)
  ("do not rebase or squash your branch" once review has started).
- Include authorship attribution in issue and pull request comments.
- **Always** add an `Assisted-By` trailer to commit messages, in the format:
  ```text
  Assisted-by: AGENT_NAME:MODEL_VERSION
  ```
- **Never** add a `Co-Authored-By` or `Signed-off-by` trailer on behalf of the
  agent. Sign-off is a human certification under the
  [DCO](contribution-workflow.md#developer-certificate-of-origin-dco) and must be
  performed by the human contributor, not automated by tooling.

### Why `Assisted-by` and not `Signed-off-by`/`Co-Authored-By`

These two rules work together deliberately:

- `Signed-off-by` is a legal certification (the DCO) that only a human can
  meaningfully make — an agent cannot attest to copyright ownership or license
  compliance on a person's behalf.
- `Co-Authored-By` in Git tooling is treated as a real authorship signal (see
  [PR Co-authors](governance-and-security.md#pr-co-authors) in the governance
  guide) that mergers must reconcile against the actual commit history when
  writing the squash message; crediting a model as a "co-author" would corrupt
  that signal.
- `Assisted-by` gives reviewers and mergers a clear, low-friction disclosure of
  AI involvement without pretending the agent is a legal co-author — directly
  satisfying disclosure rule 4 from `CONTRIBUTING.md`'s AI Contribution Policy
  above.

## 3. How the two policies fit together

| Concern | Human-facing (`CONTRIBUTING.md`) | Agent-facing (`AGENTS.md`) |
|---|---|---|
| Disclosure | Disclose AI assistance in the PR/issue | Emit an `Assisted-by` trailer on every commit |
| Accountability | Contributor must understand & defend the change | N/A — the human directing the agent remains accountable |
| Legal sign-off | DCO sign-off via `git commit -s` (optional) | Never emit `Signed-off-by` — must come from the human |
| Reviewer interaction | Never let AI answer reviewer questions | N/A (agents don't participate in review threads) |
| History hygiene | "Don't rebase/squash once review starts" | "Never force-push, amend, or squash unless asked" |

In short: `CONTRIBUTING.md` governs what a *contributor* using AI must do;
`AGENTS.md` governs what an *agent* operating inside the repository must do. A
contribution produced by an agent must satisfy both — the agent-level mechanics
(trailers, commit hygiene, style rules) are how the human-facing disclosure and
accountability requirements get carried out in practice.

## Related Pages

- [Contribution Workflow & Governance](contribution-workflow.md)
- [Backend Coding Conventions](backend-coding-conventions.md)
- [Frontend Coding Conventions](frontend-coding-conventions.md)
- [Governance & Security](governance-and-security.md)
- [Issue & PR Templates and Automation](issue-pr-templates-and-automation.md)
