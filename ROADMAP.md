# ErrorLens Roadmap

ErrorLens is a local-first, research-grade security scanner for Web3 dApps, APIs,
mobile apps, and LLM features. This roadmap records what is shipped and where the
product goes next.

## Status

Live at **https://kohap-errorlens.vercel.app** — installed as an offline PWA,
verified by CI on every push.

## What's shipped

### Core workflow
- 4-step flow: Start → Target → Scan → Report, with explicit step bars between steps.
- Home is a marketing landing on desktop and a compact **app menu on mobile**
  (project status, surface selector, quick actions).
- **Multi-project sessions**: independent scans with create / switch / archive.
- **Quick Scan wizard**: URL + environment + recommended 5-surface preset.
- Live auto-compiled report as you scan, plus a completion banner at 100%.

### Scanning framework
- 8 surfaces · 117 checks: Website, Wallet flows, API, EVM, Solana, Mobile/APK,
  LLM prompt-injection, Infrastructure.
- Grouped checklists with expandable technical hints and "Mark all/Clear" per group.
- **Smoke checks**: HTTPS, reachability, RPC health, and security headers via an
  optional CORS proxy.
- **Custom surface builder** (user-defined checklists, stored locally).

### Findings & report
- Findings with severity/status/surface/owner, reproduction, evidence, and
  recommendations; **evidence file attachments** (images, PDFs, logs).
- **AI-assisted drafting** (optional, OpenAI-compatible endpoint; key stays local).
- Report output: Markdown (copy / download), self-contained **HTML export**, print,
  JSON session export/import.

### Platform
- **Offline PWA** (manifest + service worker), **light/dark brutalist themes**,
  Terms & Privacy pages, contact footer (email + GitHub).
- **CI**: GitHub Actions runs the jsdom functional suite, puppeteer browser checks,
  and an axe accessibility scan on every push.

## Architecture

- Vanilla HTML/CSS/JS SPA — no build step. `index.html`, `styles.css`,
  `catalog.js` (scan framework data), `app.js` (engine).
- State: single project per view with a projects collection in `localStorage`
  (key `errorlens-state-v3`). Export/import round-trips projects; AI key is
  excluded from exports.
- Tests: `tests/jsdom.test.js`, `tests/browser.test.js` (puppeteer-core + system
  Chrome), `tests/a11y.test.js` (axe-core). Run with `npm test` / `npm run test:a11y`.

## Roadmap — prioritized

### Phase 1 · Findings UX (highest impact)
- Group / filter / sort findings by severity, surface, status, owner.
- Read-only finding detail view (in addition to the edit dialog).
- Batch actions: set status on multiple findings, bulk delete.
- Copy a finding's markdown block.

### Phase 2 · Reporting depth
- PDF export (print-driven or a second self-contained generator).
- Per-finding evidence export (download attachments individually).
- Optional hosted share link for the HTML report (future; breaks local-first unless
  self-hosted).

### Phase 3 · Framework depth
- Import/export custom surfaces as JSON (share checklists between projects/devices).
- One-click finding templates from the Bug AI Auditor bug classes.
- Per-surface "reference" panel linking to the playbook references.

### Phase 4 · Collaboration (local-first)
- Team review comments stored in the session file.
- A review-request file (JSON) that another ErrorLens install can open.

### Phase 5 · Scanning depth
- Deeper EVM fork-check helpers (RPC-driven checks that call `eth_call`/`balance`).
- Optional headless-crawl smoke probes for deeper client-side checks.
- Keyboard-first: command palette + shortcut hints.

### Phase 6 · Platform
- Auto theme (follow system) in addition to manual toggle.
- i18n (first target: Spanish/Portuguese given the audience).
- Test reporting in CI (upload axe + test artifacts).

## Contributing / running

```bash
npm install          # dev deps
npm test             # functional + browser integration
npm run test:a11y    # axe accessibility scan
```

Open `index.html` locally or deploy the static folder to Vercel.
