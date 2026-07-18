# Codebase Analysis Summary

## Overview
- **Language:** typescript
- **Scale:** enterprise
- **Source files:** 179 (+ 71 test files)
- **Total lines:** 22,979
- **Modules:** 250
- **Dependencies:** 565
- **API endpoints:** 0
- **Circular dependencies:** 0
- **Estimated migration rounds:** 15-30+
- **Classification rate:** 38.4%
- **Frameworks detected:** vue

## File Type Breakdown
- classes: 19
- config: 1
- modules: 135
- services: 1
- tests: 71
- types: 8
- utils: 15

## Entry Points
- web_src/js/svg.test.ts (graph-detected)

## Most Depended-On Modules (migrate last)
- ActivePageTimer (web_src/js/utils/dom.ts) — Ca=81
- fetch (web_src/js/modules/fetch.ts) — Ca=48
- js/utils (web_src/js/utils.ts) — Ca=38
- rawObject (web_src/js/utils/html.ts) — Ca=28
- observer (web_src/js/modules/observer.ts) — Ca=25

## Most Stable Modules (safe foundation)
- from (tailwind.config.ts) — I=0.0
- e2e/utils (tests/e2e/utils.ts) — I=0.0
- unescaped-html-literal (tools/eslint-rules/unescaped-html-literal.ts) — I=0.0
- WorkflowGraph.utils (web_src/js/components/WorkflowGraph.utils.ts) — I=0.0
- users (web_src/js/features/admin/users.ts) — I=0.0

## Suggested Bounded Contexts

### Round 1: tests/e2e (Utils) (low complexity)
- Files: 27, Lines: 1384
- Internal deps: 23, External deps: 0
- Coupling: Ca=0.9, Ce=0.9, I=0.91
  - ⚠️ High-Ca modules (e2e/utils): many dependents — migrate LAST
  - ⚠️ Unstable group (high instability) — migrate after stable deps are done
- Modules: codeeditor.test, env.d, events.test, explore.test, external-render.test, file-view-render.test, fork.test, heatmap.test, issue-comment.test, issue-project.test

### Round 2: tools/eslint-rules (Components) (low complexity)
- Files: 7, Lines: 575
- Internal deps: 1, External deps: 1
- Coupling: Ca=0.3, Ce=0.1, I=0.5
- Modules: ci-tools, generate-codemirror-languages, generate-images, generate-svg, lint-templates-svg, VitestRuleTester, unescaped-html-literal

### Round 3: (root) (Config) (low complexity)
- Files: 8, Lines: 1944
- Internal deps: 1, External deps: 1
- Coupling: Ca=0.1, Ce=0.2, I=0.56
- Modules: functions, eslint.json.config, playwright.config, stylelint.config, from, Cite, vite.config, vitest.config

### Round 4: web_js/modules (Utils) (medium complexity)
- Files: 40, Lines: 3368
- Internal deps: 33, External deps: 199
- Coupling: Ca=5.0, Ce=1.7, I=0.48
  - ⚠️ High-Ca modules (codeeditor/utils, errors, fetch, base, fomantic/to): many dependents — migrate LAST
  - ⚠️ High-Ce modules (main, devtest, fomantic): many dependencies — ensure deps migrate first
- Modules: action-status-icon.test, action-status-icon, clipboard, command-palette, context-menu, linter, main.test, main, codeeditor/utils.test, codeeditor/utils

### Round 5: web_js/features (Config) (medium complexity)
- Files: 99, Lines: 9635
- Internal deps: 75, External deps: 315
- Coupling: Ca=1.3, Ce=3.4, I=0.64
  - ⚠️ High-Ca modules (common-fetch-action, ComboMarkdownEditor, repo-common): many dependents — migrate LAST
  - ⚠️ High-Ce modules (admin/common, ConfigFormValueMapper, common-fetch-action, features/to, ComboMarkdownEditor): many dependencies — ensure deps migrate first
- Modules: admin/common, config.test, ConfigFormValueMapper, selfcheck, users, captcha, citation, code-frequency, colorpicker, common-actions-permissions

### Round 6: web_js (Models) (low complexity)
- Files: 16, Lines: 1385
- Internal deps: 3, External deps: 120
- Coupling: Ca=3.4, Ce=4.5, I=0.6
  - ⚠️ High-Ca modules (svg, js/utils): many dependents — migrate LAST
  - ⚠️ High-Ce modules (js/index): many dependencies — ensure deps migrate first
- Modules: bootstrap, Source, Options, external-render-helper.test, external-render-helper, globals.d, globals, iife, js/index, svg.test

### Round 7: web_js/utils (Utils) (low complexity)
- Files: 19, Lines: 1376
- Internal deps: 10, External deps: 128
- Coupling: Ca=6.9, Ce=0.8, I=0.53
  - ⚠️ High-Ca modules (ActivePageTimer, rawObject, url): many dependents — migrate LAST
- Modules: color.test, color, tw, ActivePageTimer, glob.test, escape, html.test, rawObject, image.test, image

### Round 8: web_js/webcomponents (Utils) (medium complexity)
- Files: 34, Lines: 3312
- Internal deps: 18, External deps: 38
- Coupling: Ca=0.7, Ce=1.5, I=0.67
  - ⚠️ High-Ce modules (added, mermaid): many dependencies — ensure deps migrate first
- Modules: ActionRunArtifacts.test, ActionRunArtifacts, ActionRunView.test, ActionRunView, ViewFileTreeStore, WorkflowGraph.utils.test, WorkflowGraph.utils, anchors, codecopy, markup/common

## Largest Files
- eslint.config.ts (1176 lines, 0 methods)
- web_src/js/components/WorkflowGraph.utils.ts (560 lines, 26 methods)
- web_src/js/features/repo-issue.ts (522 lines, 20 methods)
- web_src/js/webcomponents/relative-time.ts (509 lines, 8 methods)
- web_src/js/features/comp/ComboMarkdownEditor.ts (455 lines, 27 methods)

## AI Turn Budgets
- **Total estimated turns:** 743
- **Strategy doc:** 39 turns (24 exploration + 15 cross-cutting + 5 synthesis)

| Round | Context | Files | Plan Turns | Execution Turns |
|-------|---------|-------|------------|-----------------|
| 1 | tests/e2e (Utils) | 27 | 23 | 54 |
| 2 | tools/eslint-rules (Components | 7 | 13 | 15 |
| 3 | (root) (Config) | 8 | 14 | 16 |
| 4 | web_js/modules (Utils) | 40 | 30 | 80 |
| 5 | web_js/features (Config) | 99 | 59 | 198 |
| 6 | web_js (Models) | 16 | 18 | 32 |
| 7 | web_js/utils (Utils) | 19 | 19 | 38 |
| 8 | web_js/webcomponents (Utils) | 34 | 27 | 68 |