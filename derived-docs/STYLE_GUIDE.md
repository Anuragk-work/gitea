# Documentation Style & Conventions (Internal Reference)

> This page is an internal authoring reference for the `security-issues` derived documentation set.
> It is not part of the primary navigation flow, but it is kept in the tree so the conventions used
> across every page in `derived-docs/` are traceable and consistent. Later phases should follow these
> rules exactly; do not introduce new formatting conventions mid-way through the set.

## Purpose of This Documentation Set

This derived wiki reorganizes Gitea's existing Markdown documentation (root-level `SECURITY.md`,
`CONTRIBUTING.md`, `WORKSPACE_ANALYSIS.md`, and the `docs/**/*.md` tree) around a single focus:
**finding and reasoning about security issues using tools like Trivy (SCA / dependency / container
vulnerability scanning) and opengrep (Semgrep-class SAST / secret-detection / CI-config linting)**.

No new facts are invented. Every claim in every page must trace back to something actually stated in
the source `.md` files. Where the source is silent or ambiguous, pages say so explicitly rather than
guessing.

## Directory Structure

```
derived-docs/
├── index.md                                    # Wiki home / navigation hub (placeholder now, finalized last)
├── STYLE_GUIDE.md                              # This file — authoring conventions only, not end-user content
├── 01-overview/
│   └── security-posture-overview.md            # Executive framing, threat model summary
├── 02-ci-security-tooling/
│   └── existing-security-tooling-in-ci.md       # govulncheck, zizmor, actionlint, depguard, license scan, Renovate
├── 03-attack-surface/
│   ├── authentication-and-sessions.md           # auth.Method chain, tokens, 2FA, LDAP secret encryption
│   ├── authorization-permission-model.md        # AccessMode / Access table / Permission
│   ├── input-handling-and-xss-defense.md         # bluemonday sanitizer, URL scheme blocklist, iframe sandbox
│   └── ssrf-webhooks-and-outbound-requests.md    # ALLOWED_HOST_LIST, webhook HMAC signing, LFS JWT auth
├── 04-configuration-hardening/
│   └── security-relevant-settings.md            # [security]/[cors] settings catalog, secrets management, headers
├── 05-supply-chain-and-container-security/
│   └── build-release-and-container-posture.md   # Cosign/GPG signing, Docker rootless, license scan, dependency pinning
├── 06-scanning-playbook/
│   └── running-trivy-and-opengrep.md            # How to slot Trivy/opengrep into this repo's existing pipeline
└── 07-vulnerability-disclosure/
    └── reporting-process.md                     # SECURITY.md process, PGP key, triage labels
```

Each numbered top-level directory maps to one coherent theme in the security-issues narrative, in the
order a reader should ideally consume them: overview → what's already automated → what the attack
surface looks like → how it's configured/hardened → supply chain → how to actually run scanners →
what to do with a real finding.

## Source Material Provenance

> **Important caveat carried through every page in this set:** the literal directory named
> `security-issues/` referenced in this context's brief does not exist in this workspace. All content
> is instead synthesized from the general Gitea Markdown documentation tree, specifically:

| Source | What it contributes |
|---|---|
| `SECURITY.md` | Vulnerability disclosure process, PGP key |
| `CONTRIBUTING.md` | `security issue` label/triage routing |
| `WORKSPACE_ANALYSIS.md` | Architecture, forbidden/required libraries (`depguard`), coding conventions |
| `docs/build-cicd-deployment/makefile-and-build.md` | `security-check`/`govulncheck`, `lint-actions`/`zizmor`/`actionlint`, `lint-go`/`golangci-lint` |
| `docs/build-cicd-deployment/github-workflows.md` | CI workflow catalog, release signing, Renovate, `zizmor` suppression pattern |
| `docs/build-cicd-deployment/docker-and-packaging.md` | Dockerfile posture, `uv`-managed lint tools |
| `docs/08-services/auth-providers.md` | Auth chain, tokens, 2FA, LDAP secret encryption |
| `docs/05-database-models/permissions-model.md` | `AccessMode`/`Access`/`Permission` model |
| `docs/09-core-modules/markup-engines.md` | HTML sanitization / XSS defense |
| `docs/09-core-modules/notify-mailer-webhook.md` | Webhook signing, SSRF protection |
| `docs/09-core-modules/lfs-and-hooks.md` | LFS JWT auth, credential-safe logging |
| `docs/04-configuration/settings-catalog.md`, `docs/03-getting-started/configuration-app-ini.md` | `[security]`/`[cors]` settings |
| `docs/02-architecture/deployment-topologies.md` | Container privilege-dropping |
| `docs/11-authentication/README.md` | Auth docs index |

Every deliverable page must cite the specific source file(s) it draws from, using the format described
below, so a reader can verify claims against the original documentation.

## Writing Conventions

### Heading Levels
- `#` (H1): exactly one per page, matching the page title. No page has more than one H1.
- `##` (H2): major sections of the page (e.g., "Threat Model", "Configuration Reference").
- `###` (H3): sub-topics within a section (e.g., specific settings, specific auth providers).
- Avoid H4+ except in rare cases (e.g., deeply nested reference tables); prefer restructuring instead.

### Citations
Cite source documentation inline, in prose, the first time a fact from that source is introduced on a
page, using this pattern:

> As described in the [Auth Providers docs](../08-services/auth-providers.md)...

Because these derived pages live under `derived-docs/`, not under the original `docs/` tree, citation
links should point back to the *original* source path relative to the repository root when the source
lives outside `derived-docs/` (e.g. `../../docs/08-services/auth-providers.md` from a page two levels
deep, or plain prose citation with the filename in backticks — e.g. `` `docs/08-services/auth-providers.md` ``
— when a working relative link cannot be guaranteed). Prefer the backtick-filename citation style for
robustness across the final directory layout; use relative Markdown links for cross-references *within*
`derived-docs/` itself, since those paths are fully controlled by this plan.

### Cross-Links Within This Wiki
- Same directory: `[Other Page](other-page.md)`
- Parent directory: `[Home](../index.md)`
- Sibling directory: `[Attack Surface](../03-attack-surface/authentication-and-sessions.md)`
- Always use relative paths, never absolute paths starting with `/`.

### Mermaid Diagrams
- Use fenced ` ```mermaid ` blocks.
- Raw `<`/`>` characters only — never HTML-entity-escape inside a mermaid block.
- Generics/parameterized labels: use `~T~` or quote the whole label (e.g. `A["List<T>"]`).
- Line breaks inside a node label: use `<br/>` inside a quoted label.
- Keep diagrams to 5–15 nodes; prefer several small focused diagrams over one large one.
- Every diagram must be traceable to something described in the source docs (e.g., the layered-monolith
  diagram in `WORKSPACE_ANALYSIS.md` is the base for the annotated security-control diagram in the
  overview page) — diagrams may add structure/callouts not spelled out verbatim in prose, but must not
  invent components that don't exist in the source material.

### Tables
Use pipe tables for:
- Settings/config references (name, purpose, default, security implication)
- Tool comparisons (e.g., existing CI tool vs. Trivy vs. opengrep — what each covers)
- Threat-model summaries (threat actor → relevant page → existing mitigation)

### Code Blocks
- Preserve real snippets (Makefile targets, `app.ini` keys, YAML workflow fragments, Go type/field
  names as described in prose) exactly as named in the source docs.
- Never fabricate example code that isn't grounded in something the source docs actually describe.
- Use language tags: `ini` for `app.ini` fragments, `yaml` for workflow snippets, `makefile` for Make
  targets, `go` only when quoting a type/field name exactly as named in source prose (not real Go
  source, which was never read directly).

### Tone & Framing
- Written for a security engineer or scanner operator who needs to (a) understand what Gitea already
  does for security, and (b) know where to point Trivy/opengrep and what to do with results.
- Explicitly call out gaps/hardening opportunities noted in source docs (e.g., `govulncheck` currently
  being non-fatal in CI) rather than glossing over them.
- Use `>` blockquotes for caveats, gaps, and "verify before relying on this" notes — especially where
  the source material itself flags something as unverified.

## Page Template

```markdown
# Page Title

One-paragraph intro: what this page covers, and which source docs it synthesizes.

## Section Heading

Synthesized content, citing sources inline.

### Sub-topic

...

## Cross-References

- [Related Page](../0X-section/page.md) — one-line description of the relevance.
```

## Completion Checklist (final phase — verified)

- [x] Every file listed in the directory structure above exists and is non-empty (verified via
      `ls -R derived-docs/` — 10 content pages plus `index.md` and this style guide, ranging from
      ~13KB to ~30KB each).
- [x] Every page has exactly one real H1 matching its title (the only page with two `# ` lines is
      this style guide, where the second occurrence is inside a fenced ```markdown``` template
      example, not a rendered heading).
- [x] Every Mermaid diagram across the set uses raw `<`/`>` characters (no HTML-entity escaping) and
      stays within the 5–15 node guideline.
- [x] Every cross-link within `derived-docs/` (checked via grep across all `.md` files) resolves to
      an actual file in this tree; every citation link back to the original `docs/**/*.md` /
      `SECURITY.md` / `CONTRIBUTING.md` / `WORKSPACE_ANALYSIS.md` source tree uses the
      `../../docs/...`-relative or backtick-filename citation style described above.
- [x] `index.md` links to every page, grouped by section, with a "Quick Start for Scanner Operators"
      callout, a full navigation table, an organization diagram, a consolidated threat-model table,
      and a source-provenance summary — it is no longer a placeholder.
