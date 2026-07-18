# Frontend & UI

An overview of Gitea's frontend assets, templates, and JavaScript/Vue components.

Gitea's UI is a hybrid of server-rendered Go `html/template` views and
progressively-enhanced client-side JavaScript/Vue "islands," bundled with Vite
and Webpack-era conventions under `web_src/`. This section covers the
template layer; the build pipeline and JS/Vue component patterns are covered
in depth under [Core Modules](../09-core-modules/README.md).

## Section Contents

| Page | Description |
|---|---|
| [Go Templates & Views](go-templates.md) | Template directory layout (`templates/`), template functions, layout inheritance, and how routers render views |
| [`web_src/` Directory Map](web_src-directory-map.md) | File-level index of every subdirectory under `web_src/js/{components,features,markup,modules,render,utils,vendor,webcomponents}` plus `web_src/{css,fomantic,svg}`, the SVG icon pipeline, and a `web_src/`-centric view of the build pipeline diagram |

## Where to Go Next

| If you want to... | Go to |
|---|---|
| See the Vite/build pipeline for JS/CSS | [Frontend Build Pipeline](../09-core-modules/frontend-build.md) |
| See client-side Vue components and interactivity patterns | [Frontend Features & Islands of Interactivity](../09-core-modules/frontend-features.md) |
| See the routers that render these templates | [Web Router & Server-Rendered UI](../06-web-routers/web-routes.md) |
| See a full file-by-file map of `web_src/` | [`web_src/` Directory Map](web_src-directory-map.md) |
| See the Go-side SVG icon renderer and template func | [`web_src/` Directory Map — SVG Icon System](web_src-directory-map.md#svg-icon-system) |
| See the Markdown/AsciiDoc rendering engines these JS modules enhance | [Markup Rendering Engines](../09-core-modules/markup-engines.md) |
