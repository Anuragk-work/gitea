# Verification Report

## Methodology Note
The fresh samples are heavily skewed toward frontend tooling configs (stylelint, tailwind, eslint-json, playwright, vitest, types.d.ts) plus two Go files (`main.go`, `main_timezones.go`). This limits verification of many backend-specific claims (ORM patterns, migrations, error handling idioms, models/services layering) since no model/service/migration files are present in the sample. I flag this explicitly where relevant.

---

## CONFIRMED Patterns

1. **License header format** — CONFIRMED
   - Guideline: `// Copyright <year> The Gitea Authors. All rights reserved.` + `// SPDX-License-Identifier: MIT`
   - Evidence: `main.go` has exactly this (plus an extra Gogs copyright line, which the guideline doesn't account for but doesn't contradict — see Corrections). `main_timezones.go` matches exactly.

2. **Three-block Go import grouping (stdlib → gitea.dev → third-party)** — CONFIRMED
   - Evidence: `main.go` imports: stdlib block (`os`, `runtime`, `strings`, `time`) → blank line → `gitea.dev/...` block (including blank-import side-effect group) → blank line → `github.com/urfave/cli/v3`. Matches gci convention exactly.

3. **Blank imports for side effects require explanatory comment** — CONFIRMED
   - Evidence: `main.go`: `// register supported doc types` precedes the block of `_ "gitea.dev/modules/markup/..."` imports. Also `main_timezones.go` has a multi-line comment justifying `_ "time/tzdata"`.

4. **TypeScript: `import type {...}` for type-only imports** — CONFIRMED
   - Evidence: `stylelint.config.ts`: `import type {Config} from 'stylelint';`; `tailwind.config.ts`: `import type {Config} from 'tailwindcss';`; `types.d.ts`: `import type {DefineComponent} from 'vue';`.

5. **PascalCase for imported/exported types** — CONFIRMED
   - Evidence: `Config`, `DefineComponent` used as PascalCase type imports throughout configs.

6. **Go build tag usage / platform-specific files** — Not explicitly a guideline claim, but consistent with stdlib-first philosophy (`time/tzdata` is stdlib). No contradiction.

---

## CONTRADICTED / QUESTIONABLE Patterns

1. **License header — "mandatory on every Go file" with single copyright line implied by the example**
   - Guideline shows a single-line example, but `main.go` actually has **two copyright lines** (Gogs 2014 + Gitea 2016) before the SPDX line. This isn't a contradiction of "mandatory," but the guideline's illustrative example is incomplete/misleading — real files often have multi-attribution headers. **Minor inaccuracy in example, not principle.**

2. **TypeScript: "prefer `!` non-null assertion over `?.`/`??`"** — CONTRADICTED by sample evidence
   - Evidence: `playwright.config.ts` uses `env.GITEA_TEST_E2E_URL?.replace?.(/\/$/, '')` — this is precisely `?.` optional chaining, not `!`. This is a case where the value (`env.GITEA_TEST_E2E_URL`) is *not* guaranteed non-null (it's an optional env var), so arguably this doesn't violate the guideline's caveat ("when the value is guaranteed non-null"). However, it's the only real usage instance in the sample set and it uses `?.`, not `!`, so it doesn't provide confirming evidence and slightly undercuts confidence — the one visible example goes the other way (though for a case outside the stated scope of the rule).

3. **"Frontend source lives under `web_src/` (excluded from Go linting)"** — PARTIALLY CONTRADICTED
   - Evidence: `tailwind.config.ts` content glob includes `'./{build,models,modules,routers,services}/**/*.go'` — meaning **Go template/source files ARE scanned by Tailwind** for class extraction. This doesn't contradict "excluded from Go *linting*" (ESLint/golangci-lint), but it does show Go files are not purely isolated from the frontend build tooling — Tailwind actively parses `.go` files. The guideline's phrasing ("do not mix Go and TS build artifacts") could give a false impression that Go and frontend tooling never intersect; in reality Tailwind's content scanner explicitly targets `.go` files across `build`, `models`, `modules`, `routers`, `services`. Worth clarifying.

4. **No mention of `stylelint-config-recommended` extends, `@stylistic/stylelint-plugin`, or Tailwind-specific stylelint plugins** — the guidelines' CSS section only says "prefer `flex-*` over margin utilities" and "`tw-*` only when `!important` needed" [CONVENTION]. The `stylelint.config.ts` sample reveals much richer tooling (declaration-strict-value, no-unknown-custom-properties, `@stylistic/*` rules, double-quote enforcement, etc.) that isn't hallucinated by the guideline, but it's a **materially incomplete** picture of the CSS linting setup — not a contradiction, but a significant gap (see Missing Patterns).

---

## MISSING Patterns (present in fresh code, absent from guidelines)

1. **Tailwind config specifics not documented**: `prefix: 'tw-'`, `important: true`, custom `blocklist` (banning `hidden`, `transform`, `shadow`, etc. because base Tailwind reset isn't loaded), custom color/fontSize/borderRadius theme mapped from CSS custom properties (`--color-*` vars extracted from theme CSS files), and the custom `.tw-hidden`/`.break-anywhere` utility plugin with an explicit **anti-pattern warning** ("do not use `[hidden]` attribute, `.hidden` class, inline `style=`, or jQuery show/hide — use `tw-hidden` or `showElem/hideElem/toggleElem` from `utils/dom.js`"). This is a strong, explicit convention that should be captured in guidelines, especially since it directly contradicts a naive Tailwind/CSS visibility approach.

2. **CSS/Tailwind content scanning includes `.go` template files, `.tmpl` files, and `.ts/.js/.vue`** — guidelines don't mention Tailwind scans Go source for class names at all.

3. **JSON linting via ESLint flat config with `@eslint/json` plugin** (`eslint.json.config.ts`) — separate config file dedicated to JSON/JSON5/JSONC linting with different language settings per file glob (e.g., `allowTrailingCommas` for `.vscode`/`tsconfig.json`). Guidelines mention ESLint plugins for TS/Vue but say nothing about a dedicated JSON linting pass — this is a notable omission given it's its own config file.

4. **`declare module` ambient type patterns** (`types.d.ts`) for non-TS asset imports (`*.svg`, `*.css`, `*.vue`) and for typing third-party/no-types packages (`idiomorph`, `swagger-ui-dist`, `@citation-js/*`) — this is a real, reusable convention (ambient module declarations for untyped deps) not mentioned anywhere in guidelines' TypeScript section.

5. **Playwright E2E test conventions** (`playwright.config.ts`): tests live in `./tests/e2e/`, matched via `/.*\.test\.ts/`, output to `./tests/e2e-output/`, env-driven timeout scaling (`GITEA_TEST_E2E_TIMEOUT_FACTOR`), multi-browser projects (chromium/firefox) with clipboard permissions. The guidelines' Testing Conventions section is entirely backend/Go-focused (fixtures, testify) and has **zero mention of E2E/Playwright testing**, despite this being a first-class, distinct test layer.

6. **Vitest config conventions** (`vitest.config.ts`): unit test location under `web_src/**/*.test.ts` and `tools/eslint-rules/**/*.test.ts`, `happy-dom` environment, `isolate: false`, concurrent sequencing, `stringPlugin()` for raw string imports, Vue plugin integration. Guidelines' Testing Conventions section says nothing about the JS/TS unit test runner, environment, or conventions at all — this is a significant gap given there's an entire dedicated config file for it.

7. **`cli.OsExiter` override pattern + log flush before exit** in `main.go` (`log.GetManager().Close()` called both in `OsExiter` and after `RunMainApp`) — a specific, deliberate pattern ("it is a MUST, otherwise there will be log loss") not captured anywhere in guidelines despite being flagged as critical in-code.

8. **Go build tag convention** (`//go:build windows`) for platform-specific files with a `_timezones.go`-style suffix naming — no mention of build-tag file naming/organization convention in the "Files" naming section.

9. **`urfave/cli/v3`** as the CLI framework — guidelines mention `cmd/` structure and file pairing conventions but never name the actual CLI library in the Tech Stack / Required Libraries section, which seems like a relevant omission since it's a concrete third-party dependency choice for command handling.

---

## Confidence Ratings by Guideline Section

| Section | Confidence | Rationale |
|---|---|---|
| Tech Stack & Frameworks | LOW | No xorm/goldmark/LDAP files in sample; TS/Vite/Tailwind/Stylelint partially confirmed but with major undocumented details (see Missing #1–3) |
| Project Structure | UNVERIFIABLE | No `models/`, `services/`, `routers/`, `migrations/` files in sample |
| Coding Style & Naming (Go) | MEDIUM | License header & import grouping confirmed via `main.go`/`main_timezones.go`; struct/error/method naming claims unverifiable (no relevant files) |
| Coding Style & Naming (TS/CSS) | LOW-MEDIUM | `!`-preference claim not exemplified (one counter-example with `?.`, albeit arguably out of rule's scope); CSS convention claims (flex-*, tw-*) not directly evidenced, and actual stylelint/tailwind configs reveal far richer, undocumented rule sets |
| Required Libraries & Packages | LOW | No evidence of `gitea.dev/modules/json`, `util.ErrorWrap`, depguard-banned packages, or xorm usage in this sample batch |
| Common Patterns (Error Handling, DB Access, Component Structure, State Mgmt) | UNVERIFIABLE | Zero relevant files in sample |
| Import & Export Conventions | HIGH | Directly and cleanly confirmed by `main.go` |
| Testing Conventions | LOW | Guidelines only address Go/testify/fixtures; sample reveals entire undocumented Playwright + Vitest testing layers |

---

## CORRECTIONS Needed

1. **Add to Testing Conventions**: Document Playwright E2E setup (`tests/e2e/`, `*.test.ts` matcher, env-based timeout factor, browser projects) and Vitest unit test setup (`web_src/**/*.test.ts`, `happy-dom`, `isolate: false`). Current section is Go-only and misleadingly implies testing conventions are fully covered.

2. **Expand CSS section**: Replace vague "[CONVENTION]" bullet with concrete, sourced rules from `stylelint.config.ts` (double-quote strings, lowercase hex/units/pseudo-selectors, `@stylistic` plugin rule set) and the explicit **do-not-use** list for hiding elements (no `[hidden]`, no `.hidden`, no inline `display:none`, no jQuery show/hide — use `tw-hidden` / `showElem`/`hideElem`/`toggleElem` from `utils/dom.js`). This is a concrete, high-value, previously undocumented anti-pattern.

3. **Clarify Tailwind/Go relationship**: Amend "Frontend source lives under `web_src/`... do not mix Go and TS build artifacts" — this could misleadingly suggest total separation. Clarify: Go template/source files (`build/`, `models/`, `modules/`, `routers/`, `services/**/*.go`) ARE scanned by Tailwind's content extractor for class detection, even though Go files are excluded from *Go linting* of TS-specific rules. Word choice should distinguish "linting" from "build tool content scanning."

4. **Add ambient module declaration convention**: Note the `declare module` pattern in `types.d.ts` for typing untyped third-party packages and non-code asset imports (`.svg`, `.css`, `.vue`) — a reusable, discoverable TS convention.

5. **Add JSON linting note**: Mention the dedicated `eslint.json.config.ts` using `@eslint/json` for `.json`/`.json5`/`.jsonc` linting with per-path language variants — currently absent from the Tech Stack's ESLint description, which only lists JS/Vue/TS plugins.

6. **Soften/qualify the `!` vs `?.`/`??` TypeScript rule**: add explicit scope caveat more prominently, since the one visible instance in fresh samples (`playwright.config.ts`) uses `?.` on an env var that is genuinely nullable — a reader could otherwise misapply the rule.

7. **Name the CLI framework**: Add `github.com/urfave/cli/v3` to Required Libraries / Tech Stack, since `cmd/` structure guidance references CLI subcommands but never states the underlying framework.

8. **Minor**: License header example should note that historical/inherited files may carry multiple copyright lines (e.g., original Gogs attribution plus Gitea), rather than implying a single fixed line.