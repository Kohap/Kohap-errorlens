# ErrorLens Reporting Reference

The report must help developers fix issues quickly. Prefer exact reproduction detail over broad security language.

## Severity Model

- Critical: Direct theft, permanent loss, protocol insolvency, unauthorized privileged control, or reliable cross-user compromise.
- High: Loss or lockup requiring specific conditions, strong exploit path, serious authorization bypass, or harmful transaction users are likely to sign.
- Medium: Meaningful financial, integrity, or availability impact with constraints or user interaction.
- Low: Limited impact, hard-to-exploit bug, misleading behavior, weak validation, or local inconsistency.
- Informational: Hardening note, test gap, observability gap, or developer experience issue.

## Finding Requirements

Each finding should include:

- ID and title.
- Severity, status, chain, affected area, and primary owner.
- Short description of the bug.
- Impact in user or protocol terms.
- Reproduction steps that start from a clean state.
- Evidence: screenshots, logs, request summaries, transaction hashes, simulations, or code references.
- Affected components: routes, files, contracts, programs, endpoints, addresses, methods, instructions, or accounts.
- Recommendation with concrete implementation guidance.
- Verification plan for the fix.

## Developer Tone

- State what failed, where it failed, and why it matters.
- Avoid vague phrases like "may be vulnerable" unless uncertainty is unavoidable.
- Separate confirmed facts from hypotheses.
- Include exact chain and environment details.
- Keep executive summaries short and reserve technical depth for findings.

## Report Order

1. Title and metadata.
2. Executive summary.
3. Scope and assumptions.
4. Severity summary.
5. Findings by severity.
6. Positive observations.
7. Test gaps and follow-up checks.
8. Appendix with raw evidence when useful.
