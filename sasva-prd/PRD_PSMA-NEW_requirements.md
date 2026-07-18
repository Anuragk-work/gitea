# PRD — PSMA-NEW: Wrap-Text Toggle for Markdown Inline Code Blocks

> Generated: 2025 | Issue: PSMA-NEW (source: [go-gitea/gitea#35314](https://github.com/go-gitea/gitea/issues/35314))
> Prior art: Draft PR [go-gitea/gitea#35529](https://github.com/go-gitea/gitea/pull/35529) — "Add markdown code block wrap toggle" (not merged)

## 1. Executive Summary

Gitea renders fenced/indented code blocks inside Markdown (issue bodies, PR
descriptions, comments, wiki pages, READMEs) with a **"copy code" button**
(`web_src/js/markup/codecopy.ts`) but no way for the reader to toggle
**line wrapping**. Long lines currently either overflow with a horizontal
scrollbar (`code-overflow-scroll`, the default emitted by the Go renderers)
or, in a couple of dev-test-only surfaces, wrap (`code-overflow-wrap`) — but
there is no interactive way to switch between the two from the rendered page.

This feature adds a **"Toggle code wrap" button** next to the existing copy
button on every rendered Markdown code block, letting users flip between
horizontal-scroll and wrapped-text display on demand. The preference is
remembered client-side (per browser) so it persists across page loads.

## 2. Problem Statement

Long lines in fenced code blocks (long log lines, long URLs, long JSON,
minified code pasted into an issue) force horizontal scrolling, which is
awkward on narrow viewports and mobile, and requires extra interaction to
read the full line. Conversely, some users prefer wrapped text as the
default and scroll-mode as the exception. Gitea's markup CSS
(`web_src/css/markup/content.css` lines 377–392) already defines both
`.code-block-container.code-overflow-wrap` and
`.code-block-container.code-overflow-scroll` rule sets, and they are
exercised in the internal `templates/devtest/markup-render.tmpl` page, but
**no production UI surface lets an end user choose between them** — the two
Go renderers (`modules/markup/markdown/markdown.go:91` for Chroma-highlighted
fences, `modules/markup/markdown/goldmark.go:132` for indented code blocks)
both hardcode `code-overflow-scroll` unconditionally.

GitHub, Codeberg and other forges offer an inline wrap toggle on rendered
code blocks; its absence is a recurring, low-friction usability gap reported
directly by a Gitea PR reviewer (silverwind) in issue #35314.

## 3. Goals & Objectives

**Business goals**
- Close a well-known usability gap relative to competitor forges (GitHub) at
  low engineering cost, reusing already-shipped CSS.
- Keep the change additive/non-breaking — no change to default rendering
  behavior unless the user opts in.

**User goals**
- Let any reader of rendered Markdown switch a code block between
  scroll-on-overflow and wrap-long-lines display with a single click.
- Remember the last-chosen mode across page navigations without requiring
  login or a server round-trip.

**Measurable outcomes**
- Wrap toggle button renders on 100% of fenced/indented code blocks inside
  `.markup` content (issues, PRs, comments, wiki, README, release notes).
- No regression in existing "copy code" button placement/behavior or in
  Mermaid/KaTeX/math code block rendering.
- Preference persists across a full page reload in the same browser.

## 4. Scope

**In scope**
- New wrap-toggle button rendered alongside the existing copy-code button on
  every `.markup .code-block-container` produced by the Markdown/AsciiDoc/
  reStructuredText/Org renderers that flow through `content.ts`
  (`web_src/js/markup/content.ts` → `initMarkupCodeCopy`-style feature init).
- Client-side persistence of the wrap preference (single global toggle,
  applied to all code blocks on the page/site — matching PR #35529's design)
  using **`localUserSettings`** (`web_src/js/modules/user-settings.ts`), not
  raw `localStorage`.
- New locale string (`code_toggle_wrap`) surfaced through
  `templates/base/head_script.tmpl` → `window.config.i18n`.
- New SVG icon asset for the wrap toggle (e.g. `material-wrap-text`),
  registered in `web_src/js/svg.ts`.
- Refactor of `web_src/js/markup/codecopy.ts` into a shared
  "code block buttons" module (as prototyped in PR #35529's
  `codeblocks.ts`) so copy + wrap buttons share one button-row container
  and one CSS file.
- Update `web_src/js/markup/mermaid.ts` to consume the shared button-row
  helper so Mermaid diagram code blocks get the same button styling
  (mermaid already renders its own zoom/reset controls — only the button
  container/styling is shared, not the wrap behavior for the diagram canvas
  itself).

**Out of scope (this iteration)**
- The **repository file/blame code view** (`web_src/js/modules/codeeditor/`
  and the raw file-view line-numbered renderer) already has its own,
  unrelated line-wrap affordance for the code editor; whether that should
  share the same persisted preference as the Markdown toggle is explicitly
  an **open question** (also raised by the issue's author) and is deferred.
- The package registry container digest block
  (`templates/package/content/container.tmpl:20`), which reuses
  `code-block-container code-overflow-scroll` directly in a template outside
  the `.markup` JS pipeline, is not wired to the toggle in this iteration
  (no copy-button/feature-init hook exists there today).
- Per-code-block (vs. global/page-wide) wrap memory is out of scope; PR
  #35529's design is a single site-wide/browser-wide toggle.
- Backend renderer changes to emit a *default* wrap mode are out of scope —
  default remains `code-overflow-scroll` server-side; the client toggles the
  class in the DOM.

## 5. Stakeholders

| Role | Party |
|---|---|
| Product / Issue reporter | silverwind (issue #35314 author) |
| Frontend engineering | Gitea core maintainers / contributor of PR #35529 |
| Design/UX review | Gitea maintainers (icon choice, button placement) |
| QA | Gitea QA / community testers (cross-renderer, cross-locale) |
| End users | Anyone reading rendered Markdown (issues, PRs, wiki, README) on any Gitea instance |
| Localization | Crowdin translators (new `code_toggle_wrap` string needs translation) |

## 6. User Personas

Skipped — users are self-evident from context (any reader of rendered
Markdown content on a Gitea instance; no distinct persona segmentation
needed beyond "reader" vs. "content author").

## 7. User Stories / Use Cases

1. **As a reader viewing a long log dump in an issue comment**, I want to
   click a "wrap" button on the code block so long lines wrap instead of
   requiring horizontal scrolling.
2. **As a reader who has already toggled wrap mode on one code block**, I
   expect the same wrap preference to apply automatically to other code
   blocks I encounter later in my session/browser (global toggle, matching
   PR #35529 behavior), without needing to log in.
3. **As a mobile user**, I want wrapped code by default/via one tap, since
   horizontal scrolling is harder on touch screens.
4. **As a maintainer reviewing a PR**, when a diff/patch or Mermaid diagram
   is rendered inside a Markdown body, I want the same consistent
   copy/wrap button row so the UI feels uniform across code block types.
5. **As a translator**, I want the new toggle's tooltip/label
   (`code_toggle_wrap`) to be a translatable locale string, not hardcoded
   English text.

## 8. Functional Requirements

| # | Requirement | Code touchpoints |
|---|---|---|
| FR-1 | Rename/extend `web_src/js/markup/codecopy.ts` into a shared code-block-buttons module (e.g. `codeblocks.ts`) exporting a generic `makeCodeBlockButton()` helper used by both the copy button and the new wrap-toggle button. | `web_src/js/markup/codecopy.ts` → new `web_src/js/markup/codeblocks.ts`; `web_src/js/markup/content.ts` (import site, `initMarkupCodeCopy` call at line 22) |
| FR-2 | Add a wrap-toggle `<button>` per code block, inserted into the same button container (`.code-block-container`) as the copy button, using a dedicated SVG icon. | `web_src/js/markup/codeblocks.ts`; new icon `public/assets/img/svg/material-wrap-text.svg` and `web_src/svg/material-wrap-text.svg`; registration in `web_src/js/svg.ts` (pattern: line 25/114 `octicon-copy` registration) |
| FR-3 | On click, toggle `.code-overflow-wrap` / `.code-overflow-scroll` classes on the closest `.code-block-container`, matching the pre-existing CSS rules. | `web_src/css/markup/content.css` lines 377–392 (`.markup .code-block-container.code-overflow-wrap pre > code { white-space: pre-wrap; }` / `.code-overflow-scroll pre { overflow-x: auto; }`) |
| FR-4 | Persist the wrap preference client-side using the existing typed localStorage wrapper, not raw `localStorage` (ESLint `no-restricted-globals` forbids raw `localStorage`; see Non-Functional §9 / Open Questions §18). | `web_src/js/modules/user-settings.ts` (`localUserSettings.getBoolean/setBoolean`), consumed from `web_src/js/markup/codeblocks.ts` |
| FR-5 | On markup content initialization, read the stored preference and apply the correct class to every code block before/at render, avoiding a flash of the wrong state. | `web_src/js/markup/content.ts` → `initMarkupContent()` fan-out (`registerGlobalSelectorFunc('.markup', ...)`) |
| FR-6 | Add new translatable locale key `code_toggle_wrap` (tooltip/aria-label for the button) alongside the existing `copy_success` key. | `options/locale/locale_en-US.json` (near `"copy_success": "Copied!"`, line 104); exposed via `templates/base/head_script.tmpl` (pattern: `copy_success: {{ctx.Locale.Tr "copy_success"}}`, line 27) as `window.config.i18n.code_toggle_wrap` |
| FR-7 | Update `web_src/js/markup/mermaid.ts` to use the shared button-row helper from FR-1 for its own control buttons (zoom-in/reset/zoom-out), so styling is consistent without altering Mermaid's own pan/zoom behavior. | `web_src/js/markup/mermaid.ts` (lines ~206–210, existing `<button class="ui tiny compact icon button" ...>` controls) |
| FR-8 | New/renamed CSS module for the combined button row (copy + wrap), replacing or extending the current copy-button CSS. | `web_src/css/markup/codecopy.css` (rename/extend to `codeblocks.css`); `.markup .code-block-container:hover .auto-hide-control` rule (`web_src/css/markup/content.css` line 532) must continue to apply to both buttons |
| FR-9 | Do not change server-side rendering defaults; `modules/markup/markdown/markdown.go` (line 91) and `modules/markup/markdown/goldmark.go` (line 132) continue to emit `code-block-container code-overflow-scroll` unconditionally — wrap is a pure client-side DOM/class toggle. | `modules/markup/markdown/markdown.go:91`, `modules/markup/markdown/goldmark.go:132` (no changes) |

## 9. Non-Functional Requirements

- **Coding convention compliance**: Must not introduce a direct `localStorage`
  call — the project's ESLint config explicitly restricts this global
  (`tools/eslint-rules` restricted-globals list: `{name: 'localStorage',
  message: 'Use `modules/user-settings.ts` instead.'}`, enforced repo-wide
  per `docs/22-contributing-development/frontend-coding-conventions.md`).
  PR #35529's prototype used raw `localStorage.getItem('wrap-markup-code')`
  and would need to be adapted to `localUserSettings` to pass lint/CI.
- **Performance**: No additional network requests; the wrap toggle is a
  pure DOM class toggle plus one small synchronous localStorage read/write.
  No measurable impact on markup rendering performance (`content.ts`'s
  `registerGlobalSelectorFunc('.markup', ...)` fan-out already runs
  per-code-block work for the copy button; adding the wrap button is O(1)
  additional work per block).
- **Accessibility**: Button must have an accessible label (via the new
  `code_toggle_wrap` locale string, applied as `aria-label`/`title`,
  mirroring the existing copy button's accessible pattern) and be
  keyboard-operable (native `<button>` element, consistent with
  `makeCodeCopyButton`'s existing `createElementFromAttrs<HTMLButtonElement>`
  approach).
- **i18n**: New string must be added only to `locale_en-US.json` (source of
  truth); translations for other `options/locale/locale_*.json` files flow
  through the existing Crowdin pipeline — do not hand-edit other locale
  files.
- **Browser compatibility**: Must work without JS framework dependencies
  (vanilla DOM APIs), consistent with the rest of `web_src/js/markup/*.ts`.
- **No visual regression**: Existing `.code-block-container:hover
  .auto-hide-control` hover/reveal behavior (content.css line 532) must
  continue to apply to the new button.
- **Backward compatibility**: Devtest page
  (`templates/devtest/markup-render.tmpl`) already demonstrates both wrap
  states statically — must continue to render correctly after the CSS/JS
  module rename.

## 10. UX / UI Requirements

- Wrap-toggle button sits in the same button row as the existing copy
  button, inside `.code-block-container`, using the `auto-hide-control`
  class so it reveals on hover exactly like the copy button today.
- Icon: a dedicated "wrap text" glyph (Material Design "wrap-text" family,
  as prototyped by PR #35529's `material-wrap-text.svg`), visually distinct
  from the `octicon-copy` icon already used.
- Button state should visually indicate active/inactive wrap mode (e.g. a
  `data-active="true|false"` attribute driving button styling, as
  prototyped in PR #35529's CSS `.btn[data-active="false"]` rule) so users
  can tell at a glance which mode is currently applied.
- Tooltip/`title` text uses the new `code_toggle_wrap` locale string.

## 11. Data Requirements

- **Client-side only.** No new database tables, migrations, or REST API
  endpoints. The only "data" persisted is a boolean/string preference key
  (e.g. `wrap-markup-code`) stored via `localUserSettings`, which itself
  prefixes keys with `gitea:setting:` in `localStorage`
  (`web_src/js/modules/user-settings.ts`) — no server round-trip, no
  per-user server-side setting.
- Input: user click on the toggle button.
- Output: DOM class mutation (`code-overflow-wrap` ⇄ `code-overflow-scroll`)
  applied to all `.code-block-container` elements currently on the page,
  plus a `localStorage` write for persistence.

## 12. Business Rules

Skipped — no pricing, entitlement, or workflow-approval rules apply; this is
a pure client-side display preference with no business logic.

## 13. Dependencies & Assumptions

- **Depends on** existing CSS rules already shipped in
  `web_src/css/markup/content.css` (`.code-overflow-wrap` /
  `.code-overflow-scroll`) — no new CSS selectors needed, only a new
  trigger mechanism.
- **Depends on** the existing `svg()` icon-registration pattern in
  `web_src/js/svg.ts` and Vite's SVG import pipeline (same as
  `octicon-copy`).
- **Depends on** `localUserSettings` (`web_src/js/modules/user-settings.ts`)
  being the correct/only sanctioned localStorage wrapper (per ESLint
  restricted-globals rule) — assumption: no server-side "remember my
  code-wrap preference" is needed (client-only is acceptable per the
  issue's framing and PR #35529's design).
- **Assumption**: A single global (not per-code-block) toggle is acceptable
  UX, matching PR #35529 and the issue discussion — no per-block memory.
- **Assumption**: This feature does not need to touch the syntax-highlighted
  diff/blame code viewer (`web_src/js/modules/codeeditor/`), which already
  has its own unrelated line-wrap control for the code editor.
- PR #35529 ("Add markdown code block wrap toggle") is **draft, unmerged**
  prior art — treated as a design reference, not as shipped functionality.

## 14. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Reusing raw `localStorage` (as PR #35529 prototyped) fails CI lint (`no-restricted-globals`) or is inconsistent with codebase conventions. | Use `localUserSettings.getBoolean/setBoolean` from `web_src/js/modules/user-settings.ts` instead, per Non-Functional §9. |
| Renaming `codecopy.ts`/`codecopy.css` to `codeblocks.ts`/`codeblocks.css` breaks other import sites. | Grep all importers (`content.ts`, `mermaid.ts`) before rename; update both call sites in the same PR (confirmed only 2 files import `initMarkupCodeCopy`/`makeCodeCopyButton` today). |
| New button crowds the existing copy button on narrow/mobile viewports. | Follow PR #35529's `.code-block-buttons` flex container pattern; verify via manual/E2E screenshot check on mobile viewport widths. |
| Scope creep into the repo file-view/blame wrap control, conflating two different settings. | Explicitly out of scope this iteration (see §4); flagged as Open Question §18, matching the issue author's own open question. |
| New locale string not yet translated in 25+ non-English locale JSON files causes fallback-to-English inconsistency. | Standard Gitea i18n flow — add only to `locale_en-US.json`; Crowdin sync handles translations post-merge; UI must gracefully fall back to English string until translated. |
| Package registry container-digest code block (`templates/package/content/container.tmpl`) visually still shows old scroll-only behavior with no toggle, creating UI inconsistency. | Explicitly documented as out-of-scope surface in §4; candidate for a follow-up ticket. |

## 15. Acceptance Criteria

- [ ] A wrap-toggle button appears on every rendered Markdown code block
  inside `.markup` content (issue/PR body, comments, wiki, README) that
  previously showed the copy button, without displacing/breaking the copy
  button.
- [ ] Clicking the button toggles the code block between wrapped
  (`code-overflow-wrap`) and scrollable (`code-overflow-scroll`) display
  immediately, with no page reload.
- [ ] The chosen mode persists after a full page reload/navigation within
  the same browser (validated via `localUserSettings`, key visible under
  `gitea:setting:` prefix in browser devtools).
- [ ] The toggle button has a translatable, accessible label sourced from
  the new `code_toggle_wrap` locale key (verified present in
  `options/locale/locale_en-US.json` and exposed via
  `window.config.i18n.code_toggle_wrap`).
- [ ] No raw `localStorage` calls are introduced (ESLint
  `no-restricted-globals` passes in CI).
- [ ] Mermaid-rendered code fences (`web_src/js/markup/mermaid.ts`) continue
  to render their zoom/reset controls correctly using the shared button-row
  helper, with no regression to pan/zoom/reset behavior.
- [ ] `templates/devtest/markup-render.tmpl` still renders both static wrap
  states correctly (regression check for the CSS classes).
- [ ] Server-rendered HTML from `modules/markup/markdown/markdown.go` and
  `goldmark.go` is unchanged (still emits `code-overflow-scroll` by
  default) — confirmed via existing test
  `modules/markup/markdown/markdown_test.go:611`.

## 16. Success Metrics (KPIs)

- **Adoption proxy**: qualitative — GitHub issue #35314 closed as resolved
  by a merged PR; no re-opens/regressions reported within one release cycle.
- **Zero regressions**: no new bug reports against copy-button behavior or
  Mermaid/KaTeX code block rendering in the release following this change.
- **CI health**: PR passes existing `markdown_test.go` suite and any new
  frontend unit/E2E test added for the toggle, plus ESLint (no
  restricted-globals violations).
- **i18n completeness**: `code_toggle_wrap` string flows through Crowdin
  without translation-pipeline errors (standard post-merge check).

## 17. Release Plan / Milestones

Skipped — this is a small, self-contained frontend change suitable for a
single PR/release; no phased rollout needed. (If maintainers prefer, MVP =
FR-1 through FR-6 and FR-9; FR-7/FR-8 [Mermaid button-row unification] could
be split into a fast-follow if review feedback requests smaller PRs.)

## 18. Open Questions

1. **Shared vs. separate setting with the code/file view wrap control** —
   the issue author explicitly left open whether this new Markdown code
   block wrap preference should share state with the unrelated wrap toggle
   already present in the repository code editor
   (`web_src/js/modules/codeeditor/main.ts`,
   `templates/repo/editor/options.tmpl`) or the raw file/blame view. This
   PRD treats them as **separate** for now (§4 Out of Scope) — needs
   maintainer sign-off.
2. **`localStorage` vs. `localUserSettings`** — PR #35529 prototyped raw
   `localStorage.getItem('wrap-markup-code')` / `setItem`. This PRD
   recommends switching to `localUserSettings.getBoolean/setBoolean` for
   ESLint/convention compliance (§9, §14) — confirm this is acceptable to
   the eventual PR author/reviewers before implementation.
3. **Icon choice** — PR #35529 used a Material Design "wrap-text" icon
   (`material-wrap-text.svg`) rather than an Octicon, since Octicons have no
   equivalent glyph. Confirm whether mixing icon families (Octicon copy +
   Material wrap) is acceptable, or whether a custom/alternate icon should
   be sourced.
4. **Global vs. per-code-block state** — should the wrap preference apply
   site-wide/browser-wide (PR #35529's design, adopted here) or should each
   code block remember its own independent state? This PRD assumes global.
5. **Package registry container-digest block** — should
   `templates/package/content/container.tmpl`'s hardcoded
   `code-overflow-scroll` block eventually get the same toggle? Deferred as
   a follow-up (§4, §14).
6. **No JIRA ticket exists yet** — this PRD uses placeholder ID `PSMA-NEW`
   (default JIRA project `PSMA`); rename all four artifacts once a real
   ticket key is assigned.

## 19. Appendix / References

- GitHub Issue: [go-gitea/gitea#35314](https://github.com/go-gitea/gitea/issues/35314) — "Add 'Wrap text' button to inline code blocks" (silverwind, `topic/ui`, `type/proposal`, open, no milestone)
- Prior-art Draft PR: [go-gitea/gitea#35529](https://github.com/go-gitea/gitea/pull/35529) — "Add markdown code block wrap toggle" (unmerged; introduces `codeblocks.ts`, `codeblocks.css`, `material-wrap-text.svg`, `code_toggle_wrap` locale key)
- `web_src/js/markup/codecopy.ts` — current copy-button implementation
- `web_src/js/markup/content.ts` — markup feature-init orchestrator
- `web_src/css/markup/content.css` (lines 377–392, 532) — existing wrap/scroll CSS
- `web_src/js/modules/user-settings.ts` — `localUserSettings` typed localStorage wrapper
- `docs/22-contributing-development/frontend-coding-conventions.md` — ESLint restricted-globals rule forbidding raw `localStorage`
- `modules/markup/markdown/markdown.go:91`, `modules/markup/markdown/goldmark.go:132` — server-side renderers emitting `code-overflow-scroll`
- `templates/devtest/markup-render.tmpl` — existing static demonstration of both wrap states
- `templates/package/content/container.tmpl:20` — additional (currently out-of-scope) consumer of `code-overflow-scroll`
