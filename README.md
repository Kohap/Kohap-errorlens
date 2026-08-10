# ErrorLens

ErrorLens is a local-first, research-grade security scanner for Web3 dApps, APIs,
mobile apps, and LLM features. It turns the Bug AI Auditor and Web3 Site Auditor
frameworks into a guided, four-step workflow — target → scan → findings → report —
and compiles a developer-ready Markdown report. Everything runs in the browser;
no data leaves your machine.

## What it scans

Eight surfaces, each with a grouped, framework-backed checklist:

- Website & Frontend — client integrity, auth & session, trust UX
- Wallet & Transaction Flows — connect, build, sign
- REST / GraphQL API — authorization, validation, business logic
- EVM Smart Contracts — access control, accounting, external calls
- Solana Programs — account validation, authority & CPI, accounting
- Mobile / APK — client secrets, components & intents, transport
- LLM / Prompt Injection — jailbreak, indirect injection, guardrails
- Infrastructure & Trust — transport security, hosting, operations

## Files

- `index.html`, `styles.css`, `catalog.js`, `app.js` — the ErrorLens app.
  `catalog.js` holds the scan framework (surfaces, checks, severity rubric,
  operating rules); `app.js` holds the engine.
- `frameworks/jailbreak-prompt-injection.md` — the LLM/prompt-injection framework.
- `SKILLS.md` — skills to build the product and run real audits.
- `web3-site-auditor/` — the reusable Codex audit skill (EVM/Solana/reporting).

## Use

Open `index.html` in a browser. State persists in localStorage per browser; use
**Export .json** to save a session and **Import .json** to restore it.

1. **Start** — choose your surfaces from the home page.
2. **Target** — project, URL, RPC (optional), environment, chains, scope, assumptions.
3. **Scan** — run smoke checks, then work the grouped checklist. Each check has a
   plain-language (Founder) and a technical (Researcher) hint. "Log finding"
   pre-fills the finding editor.
4. **Report** — review stats and the severity chart, add positive observations and
   test gaps, then compile, copy, download, or export the report.

The report format is built for developers: severity, status, surface, affected
area, owner, reproduction steps, evidence, affected components, recommendation,
and verification plan — ending with an explicit fork/read-only verification note.
