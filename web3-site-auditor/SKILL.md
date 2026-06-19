---
name: web3-site-auditor
description: Audit Web3 sites, dApps, wallet flows, contract integrations, and developer reports for EVM and Solana targets. Use when Codex is asked to test a site for bugs, review a Web3 bug bounty target, inspect wallet or transaction behavior, analyze EVM contracts or Solana programs connected to a frontend, or compile a developer-ready security report with severity, reproduction steps, evidence, impact, and remediation.
---

# ErrorLens Web3 Site Auditor

## Overview

Use this skill to run an authorized Web3 application audit and turn raw observations into a clear developer report. The workflow covers site behavior, wallet connection, transaction signing, API/RPC boundaries, and the EVM or Solana code paths behind the user-facing flow.

## Safety Rules

- Confirm the target, chain, and testing scope before active testing.
- Do not attack production systems, bypass rate limits, exfiltrate data, drain funds, or execute destructive transactions unless the user provides explicit authorization and a safe test environment.
- Prefer local forks, testnets, dry runs, read-only calls, and reproducible simulations.
- Treat private keys, seed phrases, API keys, session tokens, and user data as secrets. Never include raw secrets in reports.
- Report uncertainty honestly. Label inferred root causes as hypotheses until verified.

## Workflow

1. Define scope:
   - Target site URL, environment, chain(s), wallet(s), account roles, and allowed test actions.
   - Contract addresses, ABIs, Solana program IDs, IDLs, repositories, RPC endpoints, and backend APIs when available.
   - Expected report audience: protocol engineers, frontend developers, backend developers, or product owners.

2. Map the application:
   - Walk the site as each relevant role and record critical flows: connect wallet, switch network, quote, approve, sign, deposit, withdraw, claim, bridge, swap, stake, vote, admin actions.
   - Identify trust boundaries between browser state, backend APIs, RPC providers, indexers, contracts/programs, and off-chain workers.
   - Capture evidence as concise screenshots, console errors, request/response summaries, transaction hashes, simulated traces, or code references.

3. Select chain guidance:
   - For EVM targets, read `references/evm.md`.
   - For Solana targets, read `references/solana.md`.
   - For report format, severity, and finding quality, read `references/reporting.md`.

4. Test bug classes:
   - Site and wallet UX: wrong network handling, unsafe signing copy, stale balances, incorrect decimals, missing slippage or recipient warnings, misleading status after failed transactions.
   - Backend/API: authorization gaps, parameter tampering, replayable quotes, stale signatures, CORS exposure, weak webhook assumptions, untrusted indexer data.
   - Chain integration: approval misuse, account confusion, replay, precision loss, privilege errors, unchecked program/contract responses, race conditions, and missing failure handling.
   - Report every finding with affected surface, chain, root cause, exploit path, impact, reproduction, evidence, and remediation.

5. Compile the report:
   - Use the ErrorLens report structure in `references/reporting.md`.
   - For structured finding data, run `scripts/report_builder.py` to produce Markdown.
   - Keep developer language concrete: name files, endpoints, addresses, methods, accounts, and exact UI actions wherever possible.

## Report Builder

Use `scripts/report_builder.py` when findings are available as JSON and the user wants a polished report.

Minimal input:

```json
{
  "project": "Target dApp",
  "site_url": "https://example.com",
  "chains": ["EVM", "Solana"],
  "scope": ["Frontend wallet flow", "Public API", "EVM contracts"],
  "summary": "Short executive summary.",
  "findings": [
    {
      "id": "EL-001",
      "title": "Approval flow allows stale spender address",
      "severity": "High",
      "chain": "EVM",
      "area": "Wallet transaction flow",
      "status": "Open",
      "description": "What is wrong and where it occurs.",
      "impact": "What an attacker or user mistake can cause.",
      "steps": ["Connect wallet", "Switch route", "Observe stale spender"],
      "evidence": ["Transaction simulation shows spender 0x..."],
      "affected": ["Swap approval form", "Router approval call"],
      "recommendation": "Regenerate approval calldata when route state changes."
    }
  ]
}
```

Example:

```bash
python scripts/report_builder.py --input findings.json --output errorlens-report.md
```

## Deliverable Standard

- Findings must be reproducible by a developer who was not present during testing.
- Each finding must include one clear primary owner: frontend, backend/API, EVM, Solana, infra, or product.
- Severity must be based on realistic impact and likelihood, not only theoretical possibility.
- If no exploit is proven, report it as a hardening recommendation or test gap instead of a vulnerability.
- End with a verification plan so the developer knows how to confirm the fix.
