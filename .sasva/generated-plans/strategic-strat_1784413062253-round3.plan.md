# Round 3 Execution Plan — PSMA-NEW: Wrap-Text Toggle Integration + CSS + Mermaid Sharing

Strategic Execution ID: `strat_1784413062253`
Round: 3 of 4
Source Strategy: `.sasva/strategic-plans/strat_1784413062253/WORK_STRATEGY.plan.md`

## Round 3 Scope

Round 2 delivered the core `codeblocks.ts` module (button creation, wrap-toggle
logic, `localUserSettings` persistence, Material `wrap-text` icon, the
`code_toggle_wrap` locale string, and unit tests) — all confirmed done below.

Round 3 wires that module into the rest of the rendering pipeline:
1. Confirm/finish integration of `codeblocks.ts` into `content.ts` (already
   largely done in Round 2 as a side effect of the refactor — this phase
   verifies and hardens the wiring per its own explicit work item and
   acceptance criteria).
2. Update `mermaid.ts` to consume the shared `makeCodeBlockButtonRow()`
   button-row helper for its zoom-in/reset/zoom-out controls, replacing its
   inline `view-controller` template-literal markup, without touching
   `initMermaidViewController` pan/zoom/reset logic.
3. Rename/extend `web_src/css/markup/codeblock.css` → `codeblocks.css`,
   update the single import site in `web_src/css/index.css`, and add the
   `data-active` visual-state rule plus the shared button-row layout rule
   consumed by both the copy/wrap buttons and Mermaid's row.
4. Perform a dedicated regression check: devtest page renders correctly,
   and zero changes exist under `modules/markup/markdown/**` (Go renderer +
   its golden-string test remain untouched).

No new npm packages, no backend/Go source changes, no new CSS behavioral
rules in `content.css` (that file is explicitly frozen — wrap/scroll rules
already exist there and must not be duplicated).

---

## Work State Confirmation (Round 2)

```json
{
  "work_state_confirmation": {
    "confirmed_done": [
      "Refactor codecopy.ts into codeblocks.ts",
      "Add material-wrap-text icon asset and registration",
      "Add code_toggle_wrap locale string",
      "Implement wrap-toggle button logic and persistence",
      "Unit tests for codeblocks.ts"
    ],
    "incomplete": []
  }
}
```

Evidence: `.sasva/strategic-plans/strat_1784413062253/round2/VERIFICATION_REPORT.md`
reports 17/17 acceptance criteria met, Build/Lint/Tests gates PASS (frontend),
and confirms via direct file reads that `web_src/js/markup/codeblocks.ts`,
`web_src/js/markup/codeblocks.test.ts`, `web_src/js/svg.ts`,
`web_src/svg/material-wrap-text.svg`, `public/assets/img/svg/material-wrap-text.svg`,
`options/locale/locale_en-US.json`, and `templates/base/head_script.tmpl` all
exist with the expected exports/keys, and that `web_src/js/markup/content.ts`
already imports `initMarkupCodeCopy` from `./codeblocks.ts` (confirmed again by
direct read in this round — see Phase 1).

---

### Phase 1: Verify and harden content.ts orchestrator wiring

**Dependencies:** none (Round 2 dependencies "Refactor codecopy.ts into codeblocks.ts" and "Implement wrap-toggle button logic and persistence" are already done)

Work item: **Wire codeblocks.ts into content.ts orchestrator**

Tasks:
- Read/confirm `web_src/js/markup/content.ts`: it already imports
  `initMarkupCodeCopy` from `./codeblocks.ts` (line 3) and calls it inside
  `registerGlobalSelectorFunc('.markup', ...)` at line 22, after the
  `.truncated-markup` early-return guard (lines 13–20). This satisfies the
  work item's structural requirement without further code change.
- Add a short clarifying code comment directly above the
  `initMarkupCodeCopy(el)` call in `web_src/js/markup/content.ts` noting
  that this single call now renders BOTH the copy button and the wrap
  toggle button (since Round 2's refactor merged both into one function),
  so future maintainers do not mistake the single call for copy-only
  behavior. Do not change the call signature, call order, or the
  `.truncated-markup` early-return logic.
- Re-verify (via direct file read + `grep -rn "initMarkupCodeCopy\|codecopy" web_src`)
  that no other file still imports the removed `codecopy.ts` or calls a
  stale copy-only init function, and that `initMarkupCodeCopy` remains the
  single entry point fanned out from `content.ts` for both buttons.
- Do not modify `initMarkupTasklist`, `initMarkupCodeMermaid`, or
  `initMarkupCodeMath` call order/behavior in this phase — Mermaid's own
  update happens in Phase 2.

#### Deliverables:
- `web_src/js/markup/content.ts`

**Acceptance Criteria:**
1. Every `.markup` code block (issue/PR/comment/wiki/README) renders both
   the copy button and the wrap-toggle button after this change (verified
   structurally: `initMarkupCodeCopy(el)` — which creates both buttons per
   `codeblocks.ts`'s `initMarkupCodeCopy` implementation — is the only
   code-block-button init call remaining in the `.markup` fan-out).
2. Truncated markup content (`.truncated-markup`) still skips all
   code-block feature init exactly as before — the early-return at lines
   13–20 of `content.ts` is unchanged.
3. `grep -rn "codecopy" web_src` returns zero matches; `grep -rn "initMarkupCodeCopy" web_src` shows exactly one export (`codeblocks.ts`) and its consumers (`content.ts`, and `codeblocks.test.ts`).
4. All pre-existing tests pass.
5. Build succeeds.

---

### Phase 2: Update mermaid.ts to share the button-row helper

**Dependencies:** Phase 1

Work item: **Update mermaid.ts to share button-row helper**

Tasks:
- Modify `web_src/js/markup/mermaid.ts`:
  - Add an import of `makeCodeBlockButtonRow` from `./codeblocks.ts`
    (following the existing relative-import convention already used for
    `svg` from `../svg.ts` in this file).
  - Replace the inline `viewControllerHtml` template-literal block
    (currently built via `html`/`htmlRaw` at approximately lines 195–201,
    producing `<div class="view-controller auto-hide-control flex-text-block">`
    with three inline `<button>` elements for `zoom-in`/`reset`/`zoom-out`)
    with a call to `makeCodeBlockButtonRow('view-controller', ...buttons)`,
    where the three buttons are built via `makeCodeBlockButton(iconName,
    classNames, attrs)` (imported alongside `makeCodeBlockButtonRow` from
    `./codeblocks.ts`), each retaining its `data-control-action` attribute
    (`zoom-in`, `reset`, `zoom-out`), its existing icon (`octicon-zoom-in`,
    `octicon-sync`, `octicon-zoom-out` at size 12 — note
    `makeCodeBlockButton` calls `svg(iconName)` without a size parameter,
    so pass size via a wrapping approach consistent with the existing
    `svg(iconName, 12)` call: if `makeCodeBlockButton`'s signature does not
    support a size argument, either (a) extend `makeCodeBlockButton` in
    `codeblocks.ts` to accept an optional `size` parameter defaulting to the
    existing behavior, forwarding it to `svg(iconName, size)`, keeping all
    existing call sites (from `codeblocks.ts` itself) working unchanged
    since the new parameter is optional; or (b) build the buttons with
    `createElementFromAttrs`/`svg(iconName, 12)` directly in `mermaid.ts`
    exactly as today and only replace the *container* div with
    `makeCodeBlockButtonRow('view-controller')` followed by
    `.append(...buttons)`. Prefer approach (b) if it avoids modifying
    `codeblocks.ts` in this phase, since Phase 2's work item explicitly
    scopes changes to `mermaid.ts` only), and its existing `ui tiny compact
    icon button` class list preserved (achieved by passing the correct
    `classNames` argument, e.g. `'ui tiny compact icon button'`, to whichever
    button-construction path is chosen).
  - Ensure the resulting DOM structure and rendered classes remain
    functionally identical to today's output: a container with classes
    `view-controller auto-hide-control flex-text-block` (as produced by
    `makeCodeBlockButtonRow('view-controller', ...)`, since that helper
    already prepends `code-block-button-row auto-hide-control
    flex-text-block` — verify the resulting combined class list does not
    break the CSS selector `.markup .mermaid-block .view-controller` in
    Phase 3's renamed CSS file; the container will now carry an *additional*
    `code-block-button-row` class alongside `view-controller`, which is
    intentional per FR-7 sharing) containing three buttons with unchanged
    `data-control-action` attributes and icons.
  - Do NOT modify `initMermaidViewController`, its event listeners, drag
    logic, `resetView`, `initAbsolutePosition`, or any zoom/pan math.
  - Do NOT add a wrap-toggle button to the Mermaid view-controller row —
    Mermaid diagrams remain out of scope for wrap functionality.
- Run the existing `web_src/js/markup/mermaid.test.ts` suite locally
  (informational only in this phase; the dedicated testing phase for the
  round is Phase 4's regression check plus the pre-existing suite run as
  part of the round's overall test gate) to confirm no behavioral
  regression from the DOM-construction change.

#### Deliverables:
- `web_src/js/markup/mermaid.ts`

**Acceptance Criteria:**
1. Mermaid diagrams continue to render zoom-in/reset/zoom-out controls with
   identical behavior (verified against `web_src/js/markup/mermaid.test.ts`
   passing unchanged).
2. The button-row container/class styling is now sourced from the shared
   `makeCodeBlockButtonRow`/`makeCodeBlockButton` helpers in `codeblocks.ts`
   — no duplicated inline button-row markup remains in `mermaid.ts`.
3. No wrap-toggle button appears on Mermaid diagram canvases.
4. `data-control-action` attributes (`zoom-in`, `reset`, `zoom-out`) and
   icons (`octicon-zoom-in`, `octicon-sync`, `octicon-zoom-out`) are
   unchanged in the rendered output.
5. All pre-existing tests pass.
6. Build succeeds.

---

### Phase 3: Rename/extend codeblock.css → codeblocks.css

**Dependencies:** Phase 1, Phase 2

Work item: **Rename/extend codeblock.css to codeblocks.css**

Tasks:
- Create `web_src/css/markup/codeblocks.css` containing:
  - The existing two rules moved verbatim from `web_src/css/markup/codeblock.css`:
    ```css
    .markup .ui.button.code-copy {
      top: 8px;
      right: 6px;
      margin: 0;
    }

    .markup .mermaid-block .view-controller {
      right: 6px;
      bottom: 5px;
    }
    ```
  - A new rule for the shared button-row container produced by
    `makeCodeBlockButtonRow('code-block-controls', ...)` in `codeblocks.ts`
    (class `code-block-button-row code-block-controls`), positioning it
    within `.code-block-container`/`.code-block` consistent with where
    `.ui.button.code-copy` is currently positioned (top-right, `top: 8px;
    right: 6px;`), using `display: flex; gap: <existing spacing convention,
    e.g. 4px, matching Mermaid's `.view-controller` button spacing if any
    exists — inspect `.view-controller` rules already present in
    `content.css`/`codeblock.css` before introducing a new gap value>` so
    the copy and wrap buttons sit side-by-side without overlapping.
  - A new `data-active` visual-state rule for the wrap button, e.g.:
    ```css
    .markup .ui.button.code-wrap[data-active] {
      /* active/pressed visual state, e.g. background/border tint consistent
         with existing Fomantic-UI `.active`/`.ui.button` pressed conventions
         already used elsewhere in the codebase */
    }
    ```
    (Inspect existing `.ui.button` active/pressed styling conventions in
    `web_src/css/` — e.g. `.ui.button.active` patterns — and mirror that
    convention rather than inventing new colors; keep the rule minimal and
    scoped under `.markup`.)
  - Do NOT move, duplicate, or alter the `.code-overflow-wrap` /
    `.code-overflow-scroll` rules or the `.auto-hide-control` hover-reveal
    rules — those remain exclusively in `web_src/css/markup/content.css`
    (lines ~378–392 and ~520–553) and must not be touched by this phase.
- Delete `web_src/css/markup/codeblock.css` (its content has been fully
  moved into `codeblocks.css`).
- Update `web_src/css/index.css` line 53: change
  `@import "./markup/codeblock.css";` to `@import "./markup/codeblocks.css";`.
  Do not reorder or touch any other `@import` line in this file.
- Run Stylelint (`make lint-css` / part of `make lint-frontend`) mentally
  against the new file's syntax conventions (2-space indent, existing
  selector nesting style) to avoid introducing new lint violations — actual
  lint execution is covered by the round's build/test gate, not a separate
  work item here.

#### Deliverables:
- `web_src/css/markup/codeblocks.css`
- `web_src/css/index.css`

Note: `web_src/css/markup/codeblock.css` is deleted as part of this phase's
rename (its full prior content is preserved verbatim inside the new file).

**Acceptance Criteria:**
1. `web_src/css/index.css` imports `codeblocks.css` instead of `codeblock.css`.
2. `web_src/css/markup/codeblock.css` no longer exists on disk.
3. Both the copy and wrap buttons are visually positioned correctly within
   `.code-block-container`/`.code-block` (side-by-side, no overlap) and
   reveal on hover via the existing `.auto-hide-control` rules in
   `content.css` (unchanged).
4. Mermaid's `.view-controller` positioning rule is preserved unchanged in
   the renamed file.
5. No Stylelint violations introduced.
6. All pre-existing tests pass.
7. Build succeeds.

---

### Phase 4: Devtest page and Go golden-test regression check

**Dependencies:** Phase 1, Phase 2, Phase 3

Work item: **Devtest page and Go golden-test regression check**

This is a verification-only phase (per the strategy's work item — "Files to
Modify: none", "Files to Create: none"). No source files are created or
modified; it performs and records the following checks:

Tasks:
- Read `templates/devtest/markup-render.tmpl` and confirm it still renders
  its two static wrap-state demo blocks (`.code-block-container
  .code-overflow-wrap` at line 22 and `.code-block-container
  .code-overflow-scroll` at lines 32/35) using only static CSS classes —
  confirm no JS/CSS rename from Phases 1–3 affects this template, since it
  does not reference `codeblock.css`/`codeblocks.css` by filename nor call
  any JS module directly (styling is applied globally via
  `web_src/css/index.css`, and behavior is applied globally via
  `initMarkupContent()`'s `.markup` selector fan-out, both of which this
  template participates in like any other rendered markup page).
- Confirm via `grep`/`git diff` that zero changes exist under
  `modules/markup/markdown/**` (specifically `modules/markup/markdown/markdown.go`,
  `modules/markup/markdown/goldmark.go`, and
  `modules/markup/markdown/markdown_test.go`) as a result of Round 2 and
  Round 3 work — these files must remain byte-for-byte identical to their
  pre-Round-2 state.
- Confirm the golden-string assertion in
  `modules/markup/markdown/markdown_test.go` (around line 611, asserting
  the exact `code-block-container code-overflow-scroll` HTML emitted by the
  Go renderer) still passes unmodified — this test does not depend on any
  frontend JS/CSS file and should be unaffected by Phases 1–3, but must be
  explicitly re-run as part of the round's Go test gate to confirm zero
  regression.
- Record findings (no code changes expected or permitted here); if any
  unexpected drift is found in `modules/markup/markdown/**`, that is a
  gate failure to be reported, not silently fixed by expanding this
  phase's scope (Go renderer changes are explicitly out of scope for this
  entire feature per the strategy).

#### Deliverables:
(none — verification-only phase; no files created or modified)

**Acceptance Criteria:**
1. `templates/devtest/markup-render.tmpl` renders without errors and both
   static wrap states display correctly (manual/structural check via the
   devtest route or direct template read confirming static classes are
   unaffected).
2. `git diff` shows zero changes to `modules/markup/markdown/**`.
3. `modules/markup/markdown/markdown_test.go` (golden HTML test at line
   611) passes unmodified.
4. All pre-existing tests pass.
5. Build succeeds.

---

## Round 3 Summary

| Phase | Work Item | Files Touched | Depends On |
|---|---|---|---|
| 1 | Wire codeblocks.ts into content.ts orchestrator | `web_src/js/markup/content.ts` | none |
| 2 | Update mermaid.ts to share button-row helper | `web_src/js/markup/mermaid.ts` | Phase 1 |
| 3 | Rename/extend codeblock.css to codeblocks.css | `web_src/css/markup/codeblocks.css` (new), `web_src/css/index.css` (modified); `web_src/css/markup/codeblock.css` deleted | Phase 1, Phase 2 |
| 4 | Devtest page and Go golden-test regression check | none (verification only) | Phase 1, Phase 2, Phase 3 |

No dedicated testing phase is added in Round 3 because none of its four
work items create new test files (unit tests for `codeblocks.ts` were
completed in Round 2; the Playwright e2e test is scheduled for Round 4 per
the strategy's round plan). Existing test suites (`mermaid.test.ts`,
`codeblocks.test.ts`, Go `markdown_test.go`) are re-run as part of the
round's standard build/test gate to confirm zero regression from Phases
1–3, per each phase's acceptance criteria.

## Guardrails carried over from the strategy

- No raw `localStorage` usage is introduced (none of this round's changes
  touch persistence logic — that was completed in Round 2).
- No changes to `web_src/css/markup/content.css` (wrap/scroll behavioral
  rules and `.auto-hide-control` hover-reveal rules stay exactly where they
  are).
- No changes to `modules/markup/**` (Go renderers) or their tests.
- No changes to `web_src/js/modules/codeeditor/` or
  `templates/package/content/container.tmpl` (explicitly out of scope).
- `initMermaidViewController`'s pan/zoom/reset math and event listeners are
  untouched in Phase 2 — only the button-row *construction* is refactored
  to reuse shared helpers.
