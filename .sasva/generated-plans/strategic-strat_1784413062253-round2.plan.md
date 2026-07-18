# Execution Plan — Round 2
Strategic Execution ID: `strat_1784413062253`
PRD: `sasva-prd/PRD_PSMA-NEW_requirements.md`
Scope: Work Items 1–5 from `WORK_STRATEGY.plan.md` §6 (Work Item Inventory), Round 2 only.

This round builds the **core client-side module + assets + logic**, without
wiring into `content.ts`/`mermaid.ts`/CSS rename (those are Round 3), and
without e2e tests (Round 4). No Go/backend files are touched.

---

### Phase 1: Core module refactor — `codecopy.ts` → `codeblocks.ts`

Implements Work Item 1 (strategy §6, row 1).

Tasks:
1. Create `web_src/js/markup/codeblocks.ts` containing:
   - All existing logic from `web_src/js/markup/codecopy.ts` (imports of
     `svg` from `../svg.ts` and `createElementFromAttrs`, `queryElems` from
     `../utils/dom.ts`).
   - Exported function `makeCodeCopyButton(attrs: Record<string, string> = {})`
     — identical name, signature, and behavior as today (builds
     `<button class="ui compact icon button code-copy auto-hide-control">`
     with `octicon-copy` svg).
   - Exported function `initMarkupCodeCopy(elMarkup: HTMLElement): void`
     — identical name, signature, and behavior as today (queries
     `.code-block code`, builds copy button with `data-clipboard-text`,
     appends to `.code-block-container` or `.code-block` fallback).
   - Do NOT wire wrap logic into `initMarkupCodeCopy` yet — that composition
     happens conceptually in Phase 4 within the same file (this phase just
     establishes the renamed/moved module skeleton with 1:1 parity).
2. Delete `web_src/js/markup/codecopy.ts` (content fully moved, not just
   duplicated).
3. Grep the whole repo for `codecopy` and `from '\.\/codecopy` / `from '\.\.\/markup\/codecopy` references — only `web_src/js/markup/content.ts` should reference it. Since `content.ts` wiring is a Round 3 item, temporarily update the single import line in `content.ts` from `./codecopy.ts` to `./codeblocks.ts` (import path only, no logic change) so the build does not break — this is a minimal, non-functional import-path fix required for build stability, not a scope violation, since Round 3 will further edit this file's init-call wiring.
4. Do not touch `web_src/js/markup/content.ts` beyond the one import path line described in task 3.

#### Deliverables:
- `web_src/js/markup/codeblocks.ts`
- `web_src/js/markup/content.ts`

**Dependencies:** none

**Acceptance Criteria:**
- `makeCodeCopyButton` and `initMarkupCodeCopy` are exported from
  `codeblocks.ts` with identical signatures/behavior to the pre-refactor
  `codecopy.ts`.
- `web_src/js/markup/codecopy.ts` no longer exists.
- `grep -r "codecopy" web_src/` returns zero matches (file name and import
  paths).
- Build succeeds (`pnpm exec vite build` or project's equivalent frontend
  build step); no TypeScript errors.

---

### Phase 2: Material `wrap-text` icon asset + registry

Implements Work Item 2 (strategy §6, row 2). Independent of Phase 1.

Tasks:
1. Create `web_src/svg/material-wrap-text.svg` — a Material Design
   `wrap-text` glyph SVG source file, following the exact structural
   convention of existing sibling files (`web_src/svg/material-palette.svg`,
   `web_src/svg/material-invert-colors.svg`): a single `<svg>` root with
   `xmlns="http://www.w3.org/2000/svg"`, a `viewBox`, and inner `<path>`
   element(s) describing the wrap-text glyph (24x24 or 768x768 viewBox
   consistent with sibling Material icons; no `class`/`width`/`height`/
   `aria-hidden` attributes needed in the *source* file under `web_src/svg/`
   — those are added by the generator, matching how existing
   `web_src/svg/material-*.svg` source files are authored plainly before
   generation, mirroring the octicon source convention used across
   `web_src/svg/octicon-*.svg`).
2. Regenerate derived assets by running the project's SVG generator
   (equivalent of `make svg`, i.e. `node tools/generate-svg.ts` or the
   project's actual npm/make script that wraps it) so that
   `public/assets/img/svg/material-wrap-text.svg` is produced with the
   standard generated wrapper attributes (`class="svg material-wrap-text"`,
   `width="16"`, `height="16"`, `aria-hidden="true"`), matching the pattern
   seen in `public/assets/img/svg/material-palette.svg`. Do NOT hand-edit
   `public/assets/img/svg/material-wrap-text.svg` directly — it must be a
   generator output.
3. Edit `web_src/js/svg.ts`:
   - Add the import line, alphabetically grouped with other icon imports:
     `import materialWrapText from '../../public/assets/img/svg/material-wrap-text.svg';`
   - Add the registry entry to the `svgs` object:
     `'material-wrap-text': materialWrapText,`
     placed in a sensible position (kebab-case key ordering, consistent
     with existing single-flat-object style — exact alphabetical position
     is not required since the existing map is not strictly alphabetized
     for material-* vs octicon-* groups, but keep it readable near other
     single-purpose icons).
4. Confirm no other existing icon entries in `svgs` are altered (diff-check
   the surrounding lines).

#### Deliverables:
- `web_src/svg/material-wrap-text.svg`
- `public/assets/img/svg/material-wrap-text.svg`
- `web_src/js/svg.ts`

**Dependencies:** none

**Acceptance Criteria:**
- `svg('material-wrap-text')` (calling the exported `svg()` function in
  `web_src/js/svg.ts`) returns valid inline SVG markup without throwing
  `Unknown SVG icon`.
- `public/assets/img/svg/material-wrap-text.svg` exists and was produced by
  the generator (structurally consistent with sibling generated files: has
  `class="svg material-wrap-text"`, `width="16"`, `height="16"`,
  `aria-hidden="true"`).
- No unrelated entries in the `svgs` map in `web_src/js/svg.ts` are modified
  or reordered.
- Build succeeds.

---

### Phase 3: `code_toggle_wrap` locale key + `head_script.tmpl` exposure

Implements Work Item 3 (strategy §6, row 3). Independent of Phases 1–2.

Tasks:
1. Edit `options/locale/locale_en-US.json`: add a new key
   `"code_toggle_wrap": "Toggle line wrap"` (or equivalently descriptive
   English string suitable as both a button `title` and `aria-label`),
   placed adjacent to the existing `"copy_success": "Copied!",` entry
   (line 104) to keep related code-block strings grouped, following exact
   JSON formatting/indentation conventions already used in the file (2-space
   indent, trailing comma unless last key).
2. Edit `templates/base/head_script.tmpl`: add a new line inside the
   `i18n: { ... }` object (near line 27, right after the existing
   `copy_success: {{ctx.Locale.Tr "copy_success"}},` line):
   `code_toggle_wrap: {{ctx.Locale.Tr "code_toggle_wrap"}},`
3. Do not hand-edit any other locale file (`locale_*.json` for other
   languages) — only `locale_en-US.json` per strategy guideline (translation
   platform handles other languages separately).

#### Deliverables:
- `options/locale/locale_en-US.json`
- `templates/base/head_script.tmpl`

**Dependencies:** none

**Acceptance Criteria:**
- `options/locale/locale_en-US.json` contains a `code_toggle_wrap` key with
  descriptive English text, placed near `copy_success`.
- `templates/base/head_script.tmpl` exposes it as
  `window.config.i18n.code_toggle_wrap` (i.e. the added tmpl line renders
  `code_toggle_wrap: "<translated text>",` inside the `i18n` object at
  runtime).
- No other locale files are edited.
- Build succeeds (Go template compiles; `gofmt`/tmpl syntax valid).

---

### Phase 4: Wrap-toggle button, click handling, global persisted preference

Implements Work Item 4 (strategy §6, row 4). Depends on Phases 1–3 (needs
the module skeleton, the icon, and the locale string all present).

Tasks:
1. In `web_src/js/markup/codeblocks.ts`, add imports:
   - `import {localUserSettings} from '../modules/user-settings.ts';`
   - Reuse existing `svg`, `createElementFromAttrs`, `queryElems` imports.
2. Define a module-level constant for the persisted preference key:
   `const wrapMarkupCodeKey = 'wrap-markup-code';` (per strategy §6 row 4
   and §9 guidance — a single dedicated global boolean key, no per-block
   memory).
3. Add new exported function `makeCodeBlockWrapButton(attrs: Record<string, string> = {}): HTMLButtonElement`:
   - Builds `<button class="ui compact icon button code-wrap auto-hide-control">`
     (parallel class-naming convention to `code-copy`) using
     `createElementFromAttrs`, exactly like `makeCodeCopyButton`.
   - Sets `btn.innerHTML = svg('material-wrap-text')`.
   - Sets `title` and `aria-label` attributes from
     `window.config.i18n.code_toggle_wrap` (module-scope destructure at top
     of file: `const {code_toggle_wrap} = window.config.i18n;` mirroring the
     `modules/clipboard.ts:7` pattern referenced in the strategy).
   - Accepts additional `attrs` merged in (same signature style as
     `makeCodeCopyButton`), so callers can pass `data-*` attributes.
4. Add new exported function
   `applyCodeBlockWrapState(container: Element, wrapEnabled: boolean): void`
   that toggles `.code-overflow-wrap` / `.code-overflow-scroll` classes on
   the given `.code-block-container` element (using `toggleElemClass` from
   `../utils/dom.ts` or equivalent direct `classList` calls) and sets a
   `data-active` attribute (e.g. `"true"`/`"false"`) on the wrap button
   found within that container (query `.code-wrap` inside `container`) to
   drive `data-active` visual-state styling (CSS for this attribute is a
   Round 3 concern in `codeblocks.css`; this phase only sets the attribute).
5. Add new exported function `initMarkupCodeWrap(elMarkup: HTMLElement): void`
   following the exact same fan-out signature convention as
   `initMarkupCodeCopy(elMarkup: HTMLElement)`:
   - Reads the current global preference once via
     `localUserSettings.getBoolean(wrapMarkupCodeKey, false)`.
   - Uses `queryElems(elMarkup, '.code-block-container', (containerEl) => { ... })`
     (fallback to `.code-block` if no `.code-block-container` exists, mirroring
     the existing fallback logic in `initMarkupCodeCopy`) to:
     a. Build a wrap button via `makeCodeBlockWrapButton()`.
     b. Append it to the container (adjacent to where the copy button is
        appended — same container element).
     c. Apply the initial class/state via `applyCodeBlockWrapState(containerEl, initialWrapEnabled)`.
     d. Attach a `click` event listener on the button that: reads the
        container's current wrap state (via class presence check, e.g.
        `containerEl.classList.contains('code-overflow-wrap')`), computes
        the new toggled boolean, calls `applyCodeBlockWrapState(containerEl, newState)`
        on **this** container, and persists the new global preference via
        `localUserSettings.setBoolean(wrapMarkupCodeKey, newState)`. Per the
        "global toggle" scope decision, the click handler updates only the
        clicked block visually immediately, but the persisted preference is
        global and will be applied to all blocks on next `initMarkupCodeWrap`
        pass (e.g. next page load/render) — do not attempt to synchronize all
        other currently-visible blocks live in this round (that live-sync
        nuance is out of scope; acceptance criteria only requires reload-time
        consistency).
6. Do NOT introduce any raw `localStorage.getItem`/`setItem`/`removeItem`
   calls anywhere in `codeblocks.ts` — verify via self-grep before
   finishing this phase.
7. Do NOT modify `web_src/js/markup/content.ts` in this phase (the call to
   `initMarkupCodeWrap` from the orchestrator is explicitly a Round 3 item,
   Work Item 6). This phase only adds the exported function; wiring it into
   the fan-out is deferred.

#### Deliverables:
- `web_src/js/markup/codeblocks.ts`

**Dependencies:** Phase 1, Phase 2, Phase 3

**Acceptance Criteria:**
- Clicking a wrap button (once manually wired, verified indirectly here via
  unit tests in Phase 5) toggles the code block's wrap/scroll class
  immediately with no reload.
- The chosen state is written to `localUserSettings` under key
  `wrap-markup-code` and is read back correctly on the next call to
  `initMarkupCodeWrap` (simulated reload in tests).
- `grep -n "localStorage" web_src/js/markup/codeblocks.ts` returns zero
  matches (all persistence goes through `localUserSettings`).
- All pre-existing tests pass; build succeeds.

---

### Phase 5: Unit tests for `codeblocks.ts` (vitest)

Implements Work Item 5 (strategy §6, row 5). This is the round's single
dedicated testing phase — no other phase creates test files.

Tasks:
1. Create `web_src/js/markup/codeblocks.test.ts` following the exact
   sibling pattern of `web_src/js/markup/tasklist.test.ts` and
   `web_src/js/markup/mermaid.test.ts` (plain `vitest` `test()`/`expect()`
   blocks operating on DOM built via `happy-dom`, which is already the
   configured test environment — no new devDependency required).
2. Cover, at minimum, the following test cases:
   - **Copy-button regression**: calling `initMarkupCodeCopy` (re-exported
     unchanged from `codeblocks.ts`) on a fixture `.markup` element still
     appends a `.code-copy` button with the correct
     `data-clipboard-text` attribute, exactly as before the refactor —
     this is the "copy button behavior is unchanged (regression)" case
     called out in the work item's acceptance criteria.
   - **Wrap button creation**: `makeCodeBlockWrapButton()` returns an
     `HTMLButtonElement` with class `code-wrap`, inner SVG markup present,
     and `title`/`aria-label` set to a non-empty string.
   - **Initial class applied from stored preference**: mock/stub
     `localUserSettings.getBoolean` (or set it via the real
     `localUserSettings.setBoolean('wrap-markup-code', true)` against a
     `happy-dom`-backed `window`/`localStorage`) before calling
     `initMarkupCodeWrap` on a fixture container, then assert the container
     ends up with `.code-overflow-wrap` (not `.code-overflow-scroll`).
   - **Click toggles class + persists new preference**: build a fixture,
     call `initMarkupCodeWrap`, dispatch a `click` event on the resulting
     wrap button, then assert (a) the container's class flipped
     appropriately and (b) `localUserSettings.getBoolean('wrap-markup-code')`
     reflects the newly toggled value.
   - **`data-active` attribute**: after `applyCodeBlockWrapState(container, true)`,
     assert the wrap button inside `container` has `data-active="true"`;
     after `applyCodeBlockWrapState(container, false)`, assert
     `data-active="false"`.
3. Ensure test fixtures construct minimal but structurally accurate markup:
   an outer `.markup` div containing `.code-block-container` > `pre` >
   `code`, matching the real server-rendered structure described in the
   strategy's Current State Analysis table.
4. Do not add any Playwright/e2e files in this phase (out of scope for
   Round 2 — Work Item 10 belongs to Round 4).

#### Deliverables:
- `web_src/js/markup/codeblocks.test.ts`

**Dependencies:** Phase 4

**Acceptance Criteria:**
- New vitest suite covers: initial class applied from stored preference,
  click toggles class + persists new preference, copy-button behavior is
  unchanged (regression), wrap-button creation, and `data-active` attribute
  state.
- Running the project's vitest command scoped to this file (equivalent of
  `pnpm exec vitest run web_src/js/markup/codeblocks.test.ts`) passes
  locally.
- All pre-existing tests (including `tasklist.test.ts`, `mermaid.test.ts`,
  and any other existing vitest suites) continue to pass unchanged.
- Build succeeds.

---

## Round 2 Summary

| Phase | Work Item(s) | Files | Depends On |
|---|---|---|---|
| 1 | WI-1 | `codeblocks.ts` (new), `codecopy.ts` (removed), `content.ts` (import path only) | none |
| 2 | WI-2 | `material-wrap-text.svg` (source + generated), `svg.ts` | none |
| 3 | WI-3 | `locale_en-US.json`, `head_script.tmpl` | none |
| 4 | WI-4 | `codeblocks.ts` | 1, 2, 3 |
| 5 | WI-5 | `codeblocks.test.ts` (new) | 4 |

**Out of scope for this round (deferred to Round 3/4 per strategy §11):**
`content.ts` init-call wiring beyond the single import-path fix, `mermaid.ts`
changes, `codeblock.css` → `codeblocks.css` rename, devtest page checks,
Playwright e2e tests, full lint/build/test gate hardening, accessibility and
mobile-viewport manual checks. No `modules/markup/**` Go files are touched by
any phase in this round.
