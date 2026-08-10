# Jailbreak & Prompt-Injection Framework

Reference checklist for testing LLM features — jailbreak attempts, indirect prompt
injection, data-flow leaks, and guardrails. Mapped to the `llm` surface in the
ErrorLens scanner and derived from OWASP LLM Top 10 practice.

## Safety rules

- Test only against your own deployed model, an approved staging build, or a
  target the user owns and authorizes.
- Never persist real user PII, keys, or internal data in a prompt test suite.
- Never chain a successful jailbreak into a real privileged tool call.

## Checklist

### Prompt safety

- Direct jailbreak prompts: instruction override, role-swap ("you are now DAN"),
  developer-persona impersonation, and ignore-prior-instructions variants.
- Indirect prompt injection: attacker-controlled web pages, documents, email
  threads, and tool results ingested into the context.
- Encoding / payload smuggling: base64, Caesar/Rot13, homoglyphs, whitespace and
  control-character tricks, incremental multi-turn assembly.
- Multi-turn memory poisoning: injecting instructions early that steer a later
  privileged action.
- System-directive disclosure: roleplay and persona-reversal prompts that try to
  dump the system prompt, tool list, or hidden configuration.

### Data flow

- PII and secret filtering before the model and on output; confirm the model
  cannot echo keys, tokens, or another user's data.
- Tool / function-call abuse: allowlisted tools, parameter constraints, and no
  paths from user input to privileged mutations.
- Exfiltration channels: outputs, links, images, and follow-up tool calls.
- Training-data and model-internal exposure resistance.

### Guardrails

- Human-in-the-loop for privileged actions (pay, approve, mint, admin).
- Input and output moderation that blocks end-to-end, not just in the UI.
- Rate limits and abuse detection on the model endpoints and tool side-effects.
- Clear separation between system instructions and user-controlled content.

## Severity mapping

| Severity | Example |
| --- | --- |
| Critical | Indirect injection steers a privileged tool call that moves funds or data. |
| High | Jailbreak reliably bypasses moderation to exfiltrate data or act as admin. |
| Medium | Injection changes assistant behavior; tool call requires extra steps to abuse. |
| Low | Prompt-injection text is echoed but constrained; content-filter bypass with no impact. |
| Informational | Missing moderation or observability hardening. |

## Evidence to capture

- Exact prompt, prior-turn context, model output, and tool-call trace.
- Which guardrail did and did not fire.
- Reproduction path from user input to impact.
