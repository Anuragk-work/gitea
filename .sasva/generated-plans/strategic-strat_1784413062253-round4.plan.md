# Execution Plan — Round 4: E2E Tests + Hardening
Strategic Execution ID: `strat_1784413062253`
Strategy Reference: `.sasva/strategic-plans/strat_1784413062253/WORK_STRATEGY.plan.md`
Round: 4 of 4 (final round per Work Round Plan §4 "Round 4 - E2E tests + hardening")

## Context Recap

Round 2 delivered the core `codeblocks.ts` module (refactored from
`codecopy.ts`), the `material-wrap-text` icon, the `code_toggle_wrap`
locale string, wrap-toggle click/persistence logic via `localUserSettings`,
and unit tests (`web_src/js/markup/codeblocks.test.ts`).

Round 3 wired `codeblocks.ts` into `content.ts` (`initMarkupCodeCopy`
appends both copy and wrap buttons to every `.code-block`/`.code-block-container`
via the shared `makeCodeBlockButtonRow` helper), updated `mermaid.ts` to
consume `makeCodeBlockButtonRow` for its `view-controller` row (zoom
controls unaffected, no wrap button on mermaid), renamed
`codeblock.css` → `codeblocks.css` (imported at `web_src/css/index.css:53`),
and verified the devtest page + Go golden-HTML test remain untouched.
Round 3's VERIFICATION_REPORT.md confirms **100% acceptance criteria met**,
Build PASS, Lint PASS, Frontend tests PASS (47 files / 149 tests), Go
non-integration tests PASS. The only FAIL is the pre-existing
`tests/integration.TestActionsDeleteRun` environment issue (missing
built `gitea` binary + git hooks), which matches the Round-0 baseline
and is explicitly out of scope for this feature.

This is the final round: only 2 work items remain per `work_state.json`
round 4 assignment: (1) a new Playwright e2e spec, and (2) a full
lint/build/test verification + accessibility/keyboard hardening pass.
No source refactors are planned — only additive test coverage and a
verification/hardening check. Per the "Testing phases" rule, both e2e
test creation and the verification pass are grouped appropriately: the
e2e file itself is a dedicated test-file deliverable (Phase 1), and the
lint/build/test/accessibility verification is a dedicated verification
phase (Phase 2) that touches no application source files — only reads
and, if needed, minimal accessibility attribute fixes already present
in `codeblocks.ts` (verified below to already satisfy the criteria, so
no source edits are anticipated; Phase 2 is verification-only).

## Established Patterns To Follow (from Rounds 2–3)

- **E2E test file pattern** (`tests/e2e/mermaid.test.ts`, `readme.test.ts`,
  `user-settings.test.ts`): single `test()` block using `@playwright/test`
  `test`/`expect`, helpers imported from `./utils.ts`
  (`apiCreateRepo`, `apiCreateIssue`, `randomString`, `assertNoJsError`).
  Repos are created via API (`apiCreateRepo`), issues via `apiCreateIssue`
  with a markdown `body` string, then `page.goto()` to the issue URL.
- **Rendered code block DOM** (confirmed in `codeblocks.ts` /
  `codeblocks.test.ts`): a fenced code block renders as
  `.code-block-container` (or bare `.code-block` if no container) wrapping
  `pre.code-block > code`, with a `.code-block-button-row.code-block-controls`
  appended directly under `.code-block-container` containing
  `button.code-copy.auto-hide-control` and `button.code-wrap.auto-hide-control`.
  The wrap button carries `title`/`aria-label` = locale string
  `"Toggle line wrap"` (`code_toggle_wrap`), `aria-pressed="true|false"`,
  and toggles `data-active` attribute plus `.code-overflow-wrap` /
  `.code-overflow-scroll` classes on the `.code-block-container`.
- **Persistence key**: `localUserSettings` key `wrap-markup-code`
  (auto-prefixed internally to `gitea:setting:wrap-markup-code`), set via
  `localUserSettings.setBoolean()` inside the wrap button's click handler
  in `codeblocks.ts`. On next `initMarkupCodeCopy()` pass (e.g. after a
  full page reload), the stored preference is read via
  `localUserSettings.getBoolean('wrap-markup-code')` and pre-applied to
  every code block found on that pass — this is what the e2e test's
  reload-and-assert-persistence step exercises.
- **No raw `localStorage`** — grep-verifiable; the e2e test does not need
  to touch storage directly, it only needs to reload the page and assert
  DOM state, consistent with how `user-settings.test.ts` verifies
  persisted profile fields by reloading/re-navigating.
- **`assertNoJsError(page)`** helper from `utils.ts` is used at the end of
  UI-interaction e2e tests (see `mermaid.test.ts`) to catch runtime JS
  errors; reused here.
- Playwright config / test runner: `make test-e2e` = `playwright frontend
  backend` (per `Makefile:487`); tests run under `tests/e2e/*.test.ts`
  against a running Gitea instance driven by env vars
  `GITEA_TEST_E2E_USER`, `GITEA_TEST_E2E_URL`, etc. (see `utils.ts`).

## Work State Confirmation

```json
{
  "work_state_confirmation": {
    "confirmed_done": [
      "Wire codeblocks.ts into content.ts orchestrator",
      "Update mermaid.ts to share button-row helper",
      "Rename/extend codeblock.css to codeblocks.css",
      "Devtest page and Go golden-test regression check"
    ],
    "incomplete": []
  }
}
```

All four Round 3 items are confirmed `done` in
`work_state.json` (round 3 status: `"done"`) and corroborated by
`.sasva/strategic-plans/strat_1784413062253/round3/VERIFICATION_REPORT.md`,
which reports 19/19 (100%) acceptance criteria met across all four items,
Build PASS, Lint PASS, and no regressions versus baseline (the sole FAIL
is the pre-existing, out-of-scope `tests/integration` environment issue
present since baseline).

---

### Phase 1: Playwright E2E Test for Wrap Toggle

**Dependencies:** none (all required source — `content.ts`, `mermaid.ts`,
`codeblocks.ts`, `codeblocks.css` — is already complete and verified from
Rounds 2–3; this phase only adds a new test file).

Implements work item: **"Playwright e2e test for wrap toggle"**
(round 4, dependencies already satisfied: "Wire codeblocks.ts into
content.ts orchestrator", "Update mermaid.ts to share button-row helper",
"Rename/extend codeblock.css to codeblocks.css" — all `done`).

Tasks:

1. Create `tests/e2e/codeblock-wrap.test.ts` following the exact pattern
   of `tests/e2e/mermaid.test.ts` / `tests/e2e/readme.test.ts`:
   - Import `env` from `node:process`, `expect`/`test` from
     `@playwright/test`, and `apiCreateRepo`, `apiCreateIssue`,
     `randomString`, `assertNoJsError` from `./utils.ts`.
   - Generate a unique repo name via `randomString(8)` (e.g.
     `e2e-codeblock-wrap-${randomString(8)}`), read `owner` from
     `env.GITEA_TEST_E2E_USER`.
   - `apiCreateRepo(request, {name: repoName, autoInit: false})`.
   - Build a markdown `body` containing a fenced code block with a
     deliberately long single line (e.g. a ~200-character line of
     repeated text with no natural wrap points, such as a long
     comma-separated list or a long URL-like token) inside a
     ```` ```text ... ``` ```` fence, to make the visual overflow/wrap
     difference meaningful (not required for the assertions but keeps
     the test realistic per FR intent).
   - `apiCreateIssue(request, {owner, repo: repoName, title: 'codeblock wrap test', body})`
     to get back `{index}`.
   - `page.goto(`/${owner}/${repoName}/issues/${index}`)`.
   - Locate the rendered container: the issue body renders inside an
     `iframe.markup-content-iframe` (same as `mermaid.test.ts`'s pattern
     of `page.frameLocator('iframe.markup-content-iframe')`); use
     `page.frameLocator('iframe.markup-content-iframe')` to scope all
     subsequent locators to that frame, matching the established pattern.
   - Within the frame, locate `.code-block-container` (or fall back to
     `.code-block` if no container renders — assert on whichever
     structural pattern actually renders for a top-level fenced block;
     use `.code-block-container` first per `codeblocks.ts`'s
     `el.closest('.code-block-container') ?? el.closest('.code-block')`
     preference) and assert it is visible.
   - Locate the wrap-toggle button via `button.code-wrap` (or
     `getByRole('button', {name: 'Toggle line wrap'})` using the
     `code_toggle_wrap` locale text as the accessible name — prefer the
     accessible-name-based locator since it exercises the real
     `aria-label`/`title` wiring end-to-end) and assert it `.toBeVisible()`.
   - Assert the container starts in the default (no persisted
     preference) scroll state: `.toHaveClass(/code-overflow-scroll/)`
     and NOT `/code-overflow-wrap/` (mirrors `codeblocks.test.ts`'s
     "defaults to scroll (no wrap) when no preference is persisted"
     unit-level assertion, now verified end-to-end).
   - Click the wrap-toggle button; assert the container now
     `.toHaveClass(/code-overflow-wrap/)` and the button now has
     `aria-pressed="true"` (Playwright's auto-retrying
     `expect(locator).toHaveClass()` / `toHaveAttribute()` — no manual
     `page.waitForTimeout()` sleeps, per the strategy's risk-mitigation
     guidance in WORK_STRATEGY.plan.md §10).
   - Reload the page (`page.reload()`), re-scope to the iframe again
     (`page.frameLocator('iframe.markup-content-iframe')`), and assert
     the same `.code-block-container` still has class
     `code-overflow-wrap` (not `code-overflow-scroll`) and the
     wrap-toggle button still reflects `aria-pressed="true"` — proving
     the `localUserSettings`-backed global preference persisted across
     a full page reload exactly as `codeblocks.ts`'s
     `initMarkupCodeCopy()` re-application logic guarantees.
   - Click the wrap-toggle button again to toggle back to scroll mode,
     and assert the container reverts to `code-overflow-scroll` and
     `aria-pressed="false"`, confirming the toggle is bidirectional
     (not a one-way/write-once flag) — this also leaves global test-user
     state clean for any other e2e test that might render a code block
     afterward in the same run.
   - Call `await assertNoJsError(page)` at the end, exactly as
     `mermaid.test.ts` does, to catch any runtime exception raised by
     the click-handler/DOM-toggle logic in `codeblocks.ts`.
   - Do NOT introduce any new helper into `tests/e2e/utils.ts` — this
     test is self-contained using only existing exported helpers, per
     the "no scope creep" rule (adding shared helpers is not part of
     this round's assigned work item).

#### Deliverables:
- `tests/e2e/codeblock-wrap.test.ts`

**Acceptance Criteria** (from `work_state.json` work item
"Playwright e2e test for wrap toggle"):
- New Playwright spec creates a repo/issue with a long-line code block
  using existing e2e helper patterns (`apiCreateRepo`/`apiCreateIssue`/
  `randomString`).
- Test asserts the wrap-toggle button is visible and clicking it toggles
  `code-overflow-wrap`/`code-overflow-scroll` on `.code-block-container`.
- Test reloads the page and asserts the previously chosen wrap state
  persists.
- All pre-existing tests pass.
- Build succeeds.

---

### Phase 2: Full Lint/Build/Test Verification and Hardening

**Dependencies:** Phase 1

Implements work item: **"Full lint/build/test verification and hardening"**
(round 4, dependency: "Playwright e2e test for wrap toggle" — satisfied
by Phase 1 within this round).

This phase is **verification-and-hardening only**: it does not plan any
new source-file creation. Its job is to (a) run the full quality-gate
suite across everything touched in Rounds 2–4, (b) confirm the
accessibility criterion already satisfied by the existing
`codeblocks.ts` implementation, and (c) apply a minimal, surgical fix
**only if** verification uncovers a genuine gap — no speculative changes.

Tasks:

1. Run `make lint-frontend` (`lint-js` + `lint-css`) across the full
   working tree and confirm **zero new violations** introduced by any
   Round 2–4 file (`web_src/js/markup/codeblocks.ts`,
   `web_src/js/markup/codeblocks.test.ts`,
   `web_src/js/markup/content.ts`, `web_src/js/markup/mermaid.ts`,
   `web_src/css/markup/codeblocks.css`, `web_src/css/index.css`,
   `tests/e2e/codeblock-wrap.test.ts`). Round 3's verification report
   already recorded ESLint/Stylelint PASS with 0 errors/0 warnings on
   the then-current file set; this phase re-confirms that status still
   holds after Phase 1 adds the new e2e spec, and specifically lints the
   new e2e file.
2. Run `make test-frontend` (vitest) and confirm the full suite passes,
   including the existing `web_src/js/markup/codeblocks.test.ts` (11
   tests per Round 3's report) and `web_src/js/markup/mermaid.test.ts` —
   no regressions.
3. Run the Go build/test gates (`go build ./...`, and the non-integration
   `go test` packages, in particular
   `go test ./modules/markup/markdown/...` to re-confirm the golden HTML
   test in `markdown_test.go` remains untouched and green) — matching
   Round 3's already-passing baseline; this phase must **not** introduce
   any diff under `modules/markup/**`.
4. If the e2e runner is available in this environment
   (`make test-e2e`, requires a running frontend+backend per
   `Makefile:487`), run `tests/e2e/codeblock-wrap.test.ts` to confirm it
   passes; if the sandboxed environment cannot stand up the full
   frontend/backend stack (as encountered for `tests/integration` in
   Round 3's report), record this as an environment limitation
   consistent with the pre-existing baseline FAIL pattern — do not treat
   an environment-level inability to run Playwright as a code defect.
5. **Accessibility/keyboard hardening check** — verify (not re-implement)
   that the wrap-toggle button in `web_src/js/markup/codeblocks.ts`
   satisfies the criterion "Wrap button is keyboard-focusable/activatable
   and has a non-empty accessible label from `code_toggle_wrap`":
   - `makeCodeWrapButton()` already produces a native `<button type="button">`
     element (via `makeCodeBlockButton()` → `createElementFromAttrs('button', ...)`),
     which is natively keyboard-focusable and activatable (Enter/Space)
     with no `tabindex` override — confirm no `tabindex="-1"` or
     `pointer-events`-only handler was introduced anywhere in
     `codeblocks.ts`.
     Verify by inspecting `codeblocks.ts`, and reject any Stylelint/ESLint
     finding to the contrary.
   - Confirm `title` and `aria-label` attributes are both set to
     `code_toggle_wrap` (`"Toggle line wrap"`) — non-empty, and
     `aria-pressed` correctly mirrors the toggle state
     (`"true"`/`"false"`) on init and on every click, per the existing
     implementation in `codeblocks.ts`'s `makeCodeWrapButton()`.
   - **If and only if** this inspection uncovers a genuine gap (e.g. a
     missing `aria-label` on some code path, or a click handler that
     only fires on `pointerdown` rather than allowing native `click`
     activation via keyboard), apply the minimal corrective edit
     directly in `web_src/js/markup/codeblocks.ts` to close that gap,
     and re-run steps 1–2 to confirm no regression. Based on the current
     confirmed content of `codeblocks.ts` (read in this planning pass),
     no such gap exists today — `aria-label`/`title`/`aria-pressed` are
     already correctly wired via native `<button>` semantics — so this
     is expected to be a **verification-only pass with no code changes**.
6. Manual mobile-viewport sanity note: confirm (via the existing,
   unmodified `content.css` hover-reveal rules at lines ~520–553 and
   `codeblocks.css`'s button-row positioning) that
   `.auto-hide-control` visibility is not exclusively a `:hover`-gated
   affordance that would be unreachable on touch/mobile viewports where
   hover is unavailable — since this CSS is pre-existing and unchanged
   by this feature (per WORK_STRATEGY.plan.md's explicit "no new CSS
   selectors needed" scope boundary), this is a **read-only
   confirmation** step, not a change; if a genuine mobile-accessibility
   regression were found it would be out of scope for this PRD (which
   only adds a wrap-toggle affordance parallel to the pre-existing copy
   button, inheriting its exact same hover-reveal behavior) and should
   be logged as a follow-up note rather than fixed in this round.
7. Produce/confirm the round's `VERIFICATION_REPORT.md` gate-results
   table (gate execution itself, e.g. actually invoking
   `.ws_build_manifest.sh build|test|lint`, is performed by the
   execution/verification engine per the project's standard round
   process — this phase's task is to ensure the codebase is in a state
   where those gates pass cleanly, per steps 1–6 above).

#### Deliverables:
(No new or modified source files are anticipated by this phase — it is a
verification/hardening pass. If step 5 uncovers a genuine accessibility
gap, the only file that may be modified is:)
- `web_src/js/markup/codeblocks.ts` (modify only if a genuine
  accessibility gap is found during verification; expected to remain
  unmodified based on current inspection)

**Acceptance Criteria** (from `work_state.json` work item
"Full lint/build/test verification and hardening"):
- `make lint-frontend` passes with zero new violations.
- `make test-frontend` passes including the existing
  `codeblocks.test.ts`.
- Wrap button is keyboard-focusable/activatable and has a non-empty
  accessible label from `code_toggle_wrap`.
- All pre-existing tests pass.
- Build succeeds.

---

## Round 4 Summary

| Phase | Work Item | Files Created | Files Modified |
|---|---|---|---|
| 1 | Playwright e2e test for wrap toggle | `tests/e2e/codeblock-wrap.test.ts` | — |
| 2 | Full lint/build/test verification and hardening | — | (none expected; `codeblocks.ts` only if a real gap is found) |

Total new files this round: 1 (test file, per the "code phases MUST NOT
create test files" rule — Phase 1 IS the dedicated testing phase for
this round, appropriately isolated from Phase 2's verification-only
scope). This satisfies the "10-25 files per round" sizing guidance at
the lower bound, consistent with this being the final, narrow-scope
hardening round per the strategy's Work Round Plan.

## Out of Scope (unchanged from strategy, reaffirmed for this round)

- No changes to `modules/markup/**` (Go renderers/golden test).
- No changes to `templates/package/content/container.tmpl` (package
  registry container-digest block).
- No changes to `web_src/js/modules/codeeditor/` (code-editor line-wrap
  preference).
- No new shared helpers added to `tests/e2e/utils.ts`.
- No CI/CD, monitoring, message-queue, Husky, or commitlint tooling.
