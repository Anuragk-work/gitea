# Frontend Coding Conventions

This page is the dedicated, deep-dive companion to the frontend summary in
[Contribution Workflow & Governance](contribution-workflow.md#3-frontend-guidelines-summary).
Both pages are sourced from the same canonical document,
[`docs/guidelines-frontend.md`](../guidelines-frontend.md), and are kept
intentionally non-duplicative:

- **This page** is the reference to link when the topic *is* frontend
  conventions — it reproduces every rule in `docs/guidelines-frontend.md` in
  full, plus the linter configuration detail (`eslint.config.ts`,
  `stylelint.config.ts`) that the summary page only mentions in passing.
- **`contribution-workflow.md`** keeps only a condensed summary plus a pointer
  back here.

> [!NOTE]
> If `docs/guidelines-frontend.md` changes, update this page first, then
> re-check that the summary in `contribution-workflow.md` § 3 hasn't drifted
> out of sync.

## Background

The frontend combines [Vue 3](https://vuejs.org/),
[Fomantic-UI](https://fomantic-ui.com/) (built on jQuery, **deprecated**,
vendored with local patches), and [Tailwind CSS](https://tailwindcss.com/),
rendered on top of Go HTML templates. Source files live in:

| Path | Contents |
|---|---|
| `web_src/css/` | CSS styles |
| `web_src/js/` | JavaScript and TypeScript |
| `web_src/js/components/` | Vue components |
| `web_src/js/features/` | Feature modules wired up at page load |
| `templates/` | Go HTML templates |

## Dependencies

Frontend dependencies are managed with [pnpm](https://pnpm.io/)
(`package.json`, `pnpm-lock.yaml`). The same dependency-hygiene rule as Go
modules applies (see
[Backend Coding Conventions § Dependencies](backend-coding-conventions.md#dependencies-go-modules)):
bump only what the PR needs, and any new version must reference an existing
published version.

## Framework usage

Mixing frameworks arbitrarily makes code hard to maintain. Recommended
combinations:

- **Vue 3**
- **Vanilla JavaScript**
- **Fomantic-UI** (jQuery), deprecated — a specific vendored version with many
  local changes.

Avoid combining Vue with Fomantic-UI JS behavior; Vue components may still
reuse Fomantic-UI CSS classes purely for visual consistency. Use Go templates
for simple or SEO-relevant pages, and Vue for complex, interactive pages. Gitea
uses Vue 3 **without JSX** to keep HTML and JavaScript separate.

> [!NOTE]
> Fomantic-UI is not an accessibility-friendly framework. Gitea patches some
> ARIA behavior, but accessibility work is ongoing — prefer semantic HTML and
> test keyboard/screen-reader behavior where you can.

## Gitea-specific conventions

- Keep features in their own files or directories.
- Use kebab-case for HTML `id`s and classes, ideally with 2–3 feature
  keywords.
- Prefix classes to avoid short-name conflicts between different frameworks.
- Create a *new* class name when overriding framework styles instead of
  editing the framework's own classes, or fix the framework's source so all
  call sites benefit.
- Prefer semantic elements such as `<button>` over generic `<div>`s.
- Avoid `!important`; when unavoidable, document why.
- Prefix custom DOM events with `ce-`.

## CSS conventions

Prefer Tailwind utility classes with the `tw-` prefix, and the `flex-*` layout
helpers over per-child margins. Gitea also ships a small set of custom
helpers — `gt-` for general helpers and `g-` for framework-level helpers (see
`web_src/css/helpers.css`) — used only when no Tailwind utility exists.

Write class attributes as a single readable unit in templates:

```html
<div class="flex-text-inline {{if .IsFoo}}tw-hidden{{end}}"></div>
```

### Stylelint enforcement

CSS conventions are enforced by [Stylelint](https://stylelint.io/) via
`stylelint.config.ts`, which extends `stylelint-config-recommended` plus:

- `@stylistic/stylelint-plugin`
- `stylelint-declaration-strict-value`
- `stylelint-declaration-block-no-ignored-properties`
- `stylelint-value-no-unknown-custom-properties`

and lints `.vue` files via `postcss-html`. Notable enforced rules:

- Double-quoted strings.
- Lower-case hex colors, properties, and units.
- 2-space indentation.
- No vendor prefixes (`selector-no-vendor-prefix`,
  `media-feature-name-no-vendor-prefix`).
- `word-break: break-word` disallowed.
- Strict color/`fill`/`stroke`/`font-weight` values — these must reference CSS
  custom properties rather than literal colors, via
  `scale-unlimited/declaration-strict-value` in `stylelint.config.ts`.

## TypeScript conventions

- Use `import type` for type-only imports.
- Prefer `@ts-expect-error` over `@ts-ignore`.
- Use the non-null assertion `!` (rather than `?.`/`??`) when a value is known
  to always exist. This is also codified for agent-driven contributions in
  [AI-Assisted Contributions](ai-assisted-contributions.md#code-style-and-content-rules).
- Only mark a function `async` if it actually `await`s or returns a
  `Promise`. Avoid async event listeners; when unavoidable, call
  `e.preventDefault()` before the first `await`. For an intentionally
  un-awaited call, assign it explicitly: `const _promise = asyncFoo();`.

### ESLint enforcement

TypeScript/JavaScript conventions are enforced by
[ESLint](https://eslint.org/)'s flat config (`eslint.config.ts`), which wires
in:

- `@typescript-eslint`
- `eslint-plugin-import-x`
- `eslint-plugin-unicorn`
- `eslint-plugin-regexp`
- `eslint-plugin-sonarjs`
- `eslint-plugin-vue` / `eslint-plugin-vue-scoped-css`
- `eslint-plugin-wc`
- `eslint-plugin-playwright`
- `@vitest/eslint-plugin`
- `@stylistic/eslint-plugin`
- A custom Gitea rule, `gitea/unescaped-html-literal`, defined in
  `tools/eslint-rules/unescaped-html-literal.ts`, that guards against
  unescaped HTML in template literals (XSS prevention).

It also restricts direct use of certain globals in favor of Gitea's own
wrappers:

```ts
const restrictedGlobals = [
  {name: 'localStorage', message: 'Use `modules/user-settings.ts` instead.'},
  {name: 'fetch', message: 'Use `modules/fetch.ts` instead.'},
];
```

## Data fetching

Use the `GET`, `POST`, `PUT`, `PATCH`, and `DELETE` wrappers from
[`web_src/js/modules/fetch.ts`](../../web_src/js/modules/fetch.ts) instead
of raw `fetch()` — enforced by the ESLint restricted-globals rule above.

## DOM attributes

Avoid `node.dataset` because of its camel-casing behavior; use
`node.getAttribute` in new code. Never bind user-provided data directly onto
DOM nodes.

## Showing and hiding elements

- In Vue, use `v-if` and `v-show`.
- In Go templates and plain JavaScript, use the `.tw-hidden` class together
  with the `showElem()`, `hideElem()`, and `toggleElem()` helpers from
  [`web_src/js/utils/dom.ts`](../../web_src/js/utils/dom.ts).

## UI component gallery

A UI component gallery is available in development mode at `/devtest` (for
example `http://localhost:3000/devtest`); it is also exercised by the e2e
tests.

See also [Frontend Architecture](../09-core-modules/frontend-build.md),
[Frontend Features](../09-core-modules/frontend-features.md), and the
[web_src Directory Map](../20-frontend-ui/web_src-directory-map.md) for how
these conventions map onto the actual build pipeline and directory structure.

## Related Pages

- [Contribution Workflow & Governance](contribution-workflow.md)
- [Backend Coding Conventions](backend-coding-conventions.md)
- [AI-Assisted Contributions](ai-assisted-contributions.md)
- [Frontend Architecture](../09-core-modules/frontend-build.md)
- [Frontend Features](../09-core-modules/frontend-features.md)
- [web_src Directory Map](../20-frontend-ui/web_src-directory-map.md)
