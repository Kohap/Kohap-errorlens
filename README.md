# ErrorLens

ErrorLens is a local Web3 audit report compiler for EVM and Solana application testing. It helps turn site, wallet, API, smart contract, and Solana program observations into a developer-ready bug report.

## Contents

- `index.html`, `styles.css`, `app.js` - the ErrorLens browser app.
- `web3-site-auditor/` - a reusable Codex skill for EVM and Solana Web3 site audits.
- `web3-site-auditor/scripts/report_builder.py` - a JSON-to-Markdown report compiler.
- `web3-site-auditor/references/` - EVM, Solana, and reporting checklists.

## Use

Open `index.html` in a browser, add audit scope and findings, then compile or download the Markdown report.

The report format is built for developers: severity, affected chain, affected area, reproduction steps, evidence, impact, recommendation, and verification plan.
