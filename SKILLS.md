# SKILLS.md — Building and running ErrorLens

ErrorLens is a local-first, multi-surface security scanner. These skills help you
build the product, keep its frameworks current, and use it to run real audits.

## Use for building the product

| Skill | When to load it |
| --- | --- |
| `design-taste` | Any time you shape the UI — hierarchy, typography, color tokens, interaction states, responsive behavior. Load before writing interface code. |
| `final-touch` | The last pass before shipping a screen: focus, touch targets, motion, empty/error states, reduced-motion, narrow-width overflow. |
| `bug-ai-auditor` | Keeping the scan framework honest: severity rubric, operating rules, fork-first verification, private disclosure, APK red-team pipeline. |
| `customize-opencode` | Wiring the repo's `web3-site-auditor` skill, adding new scanner skills, or configuring agents/MCP for audit tooling. |

## Use for running real audits with ErrorLens

| Tool / skill | What it does in the workflow |
| --- | --- |
| `web3-site-auditor` (in this repo) | Authorized EVM/Solana site audits; matches the scanner's surfaces and report format. |
| `bug-ai-auditor` + `references/bug-hunting-playbook.md` | End-to-end contract bug hunting: intake, auth triage, bug classes, fork PoC, honest severity, disclosure. |
| `frameworks/jailbreak-prompt-injection.md` (in this repo) | LLM / prompt-injection surface used by the scanner's `llm` checklist. |
| `pashov/skills` (`x-ray`, `solidity-auditor`) | Map a contract surface, then quick feedback on a diff. |
| `Archethect/sc-auditor` | Breadth pass: six parallel specialist agents + Devil's Advocate. |
| `0xiehnnkta/nemesis-auditor` | Depth pass on the value-holding contract (coupled-state hunt). |
| `marchev/claudit` | Pattern-match against Solodit's 20k+ findings for a suspicious mechanism. |
| `cholakovvv/foundry-poc-mainnet-fork` | Package a confirmed finding into a submission-ready mainnet-fork PoC. |
| `PlamenTSV/plamen` | Optional heavy run (paid) on a high-value target; PoC-gated findings. |

> Safety: verify each external repo before running untrusted code, and never pass
> private keys or bounty secrets into unvetted tooling. Fork / read-only only.

## How to install a skill

Skills are loaded by name. For installable Codex skills, review the repo, then
place or link the skill folder under your skills directory and load it by name in
your agent config. Keep audit skills in a throwaway workspace for untrusted tools.
