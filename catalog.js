// ErrorLens scan framework.
// Surfaces, grouped checklists, severity rubric, and operating rules.
// Derived from the Bug AI Auditor playbook, the Web3 Site Auditor skill
// (EVM / Solana / reporting references), the APK red-team pipeline, and
// OWASP LLM Top 10 (jailbreak / prompt-injection) coverage.

const SURFACES = [
  {
    id: "web",
    label: "Website & Frontend",
    short: "Client integrity, auth, session, and trust UX.",
    icon: "globe",
    groups: [
      {
        name: "Client integrity",
        tests: [
          { id: "w01", check: "Third-party scripts and CDNs are pinned with SRI and reviewed", plain: "Any code you load from someone else's server can be swapped for a malicious version.", hint: "Verify integrity= SRI hashes on all external scripts; flag unknown CDNs or loaded-at-runtime bundles." },
          { id: "w02", check: "Content Security Policy restricts inline scripts and remote sources", plain: "A CSP stops injected scripts from running if the page is ever tampered with.", hint: "Check Content-Security-Policy header / meta; look for 'unsafe-inline', wildcard sources, missing script-src nonces." },
          { id: "w03", check: "Clickjacking protections present (frame-ancestors or X-Frame-Options)", plain: "Protects users from being tricked into clicking buttons inside a hidden frame on another site.", hint: "Verify frame-ancestors CSP directive or X-Frame-Options; check for missing protections on sensitive pages." },
          { id: "w04", check: "No sensitive data embedded in client bundle or storage", plain: "Secrets or API keys shipped to the browser can be read by anyone.", hint: "Grep the JS bundle and localStorage/sessionStorage for keys, RPC URLs, admin endpoints, and hardcoded credentials." },
          { id: "w05", check: "Dependency and supply-chain hygiene reviewed", plain: "An outdated or malicious dependency can compromise the whole frontend.", hint: "Check package lockfiles for known-vulnerable versions, typo-squat names, and untrusted build steps." },
          { id: "w06", check: "Error messages and responses do not leak internals", plain: "Stack traces and server errors give attackers a map of your system.", hint: "Trigger error paths; confirm no stack traces, framework banners, DB details, or internal hostnames leak to clients." }
        ]
      },
      {
        name: "Auth & session",
        tests: [
          { id: "w07", check: "Access tokens are stored and transmitted securely", plain: "Tokens in localStorage can be stolen by any injected script.", hint: "Prefer httpOnly, Secure, SameSite cookies; flag localStorage session tokens and tokens in URLs." },
          { id: "w08", check: "Sessions expire, rotate, and invalidate correctly", plain: "Stolen or forgotten sessions should not stay valid forever.", hint: "Test expiry, logout invalidation, token rotation on privilege change, and replay of old tokens." },
          { id: "w09", check: "OAuth / redirects validate state, nonce, and destination", plain: "A broken redirect flow can send users to a phishing page.", hint: "Test open redirects, state/nonce reuse, and callback URL allowlists." },
          { id: "w10", check: "Authentication resists brute force and credential stuffing", plain: "Weak login protections let attackers guess passwords at scale.", hint: "Check rate limits, lockout, CAPTCHA, and password policies on login and 2FA flows." },
          { id: "w11", check: "Privilege changes re-authenticate and use session binding", plain: "High-risk actions should confirm it is really the user acting.", hint: "Verify 2FA/password prompt on role changes, binding of sessions to device/IP, and password-reset flows." }
        ]
      },
      {
        name: "Trust & UX",
        tests: [
          { id: "w12", check: "Approval and signing copy matches the real action", plain: "Users sign what the screen says — the screen must say what will actually happen.", hint: "Compare transaction preview copy against the exact spender, amount, recipient, and deadline on-chain." },
          { id: "w13", check: "Spoofable notifications / in-page messages are contained", plain: "Untrusted content shown as UI can phish users inside the app.", hint: "Check rendering of markdown, names, token symbols, or NFT metadata for HTML/JS injection into toasts or dialogs." },
          { id: "w14", check: "Sensitive default settings are safe (no dark patterns)", plain: "Defaults should not silently enable risky behavior.", hint: "Review auto-approve toggles, high gas defaults, cross-chain auto-sweep, and pre-checked 'trust this site' boxes." },
          { id: "w15", check: "Account switching and impersonation states are clear", plain: "Users must always know which account and network they are acting on.", hint: "Verify visible active-account indicator, network badge, and warnings when a watched account changes." }
        ]
      }
    ]
  },
  {
    id: "wallet",
    label: "Wallet & Transaction Flows",
    short: "Connect, network switch, build, preview, sign.",
    icon: "wallet",
    groups: [
      {
        name: "Connect & network",
        tests: [
          { id: "wt01", check: "Unsupported chain IDs are rejected and state refreshes on switch", plain: "After switching networks, quotes, balances, and buttons must update or clearly fail.", hint: "Switch networks mid-flow; confirm quotes, approvals, balances, and calldata are regenerated or blocked." },
          { id: "wt02", check: "Account switching refreshes all dependent state", plain: "Showing one account's data while acting on another is a classic exploit setup.", hint: "Change accounts mid-session; confirm balances, positions, and sign targets update or invalidate." },
          { id: "wt03", check: "Wallet disconnect and reconnect are handled cleanly", plain: "Broken reconnect logic can leave stale permissions or sessions active.", hint: "Test disconnect, reconnect, and multi-wallet switching for stale listeners or leftover approvals." },
          { id: "wt04", check: "RPC provider choice and fallbacks are trusted and consistent", plain: "A malicious or inconsistent RPC can lie about balances and state.", hint: "Review RPC selection, fallback ordering, and whether signed data ever depends on provider-supplied values." },
          { id: "wt05", check: "Cluster / environment mismatch is surfaced (dev vs mainnet)", plain: "Users must not sign a mainnet transaction thinking it is a testnet action.", hint: "Confirm cluster/network badge matches the signing environment; test URLs and tokens that cross environments." }
        ]
      },
      {
        name: "Transaction building",
        tests: [
          { id: "wt06", check: "Calldata is regenerated, never stale, after state changes", plain: "Old instructions signed at the wrong moment can move money the wrong way.", hint: "Change route/amount/token/account/chain before signing; confirm approval and swap calldata were rebuilt." },
          { id: "wt07", check: "Decimals, slippage, and fee display are accurate", plain: "Wrong decimals or hidden fees silently change what the user pays.", hint: "Verify token decimals, slippage bounds, swap fees, and native-token wrapping are displayed from the live quote." },
          { id: "wt08", check: "Recipient and spender addresses are explicit and correct", plain: "The address in the preview must match the one in the signed transaction.", hint: "Compare the sign payload spender/recipient with the displayed route; check for substituted addresses." },
          { id: "wt09", check: "Deadlines, nonces, and expiry are shown and bounded", plain: "No expiry on quotes or approvals means a stale action can execute later.", hint: "Check quote/signature expiry display, deadline bounds, and nonce handling." },
          { id: "wt10", check: "Gas, compute, and priority-fee estimates are sane", plain: "Hidden or wrong fees surprise users at the wallet.", hint: "Verify gas estimates, Solana compute budget, priority fees, and rent are realistic and surfaced." },
          { id: "wt11", check: "Fee-on-transfer, rebasing, and wrapped tokens are handled", plain: "Tokens that move or charge fees break naive balance math.", hint: "Review handling for fee-on-transfer, rebasing, and wrapped-SOL/ATA (Solana) assumptions in amounts and quotes." }
        ]
      },
      {
        name: "Signing",
        tests: [
          { id: "wt12", check: "Sign messages fully describe the intent (EIP-712 / domain)", plain: "A sign prompt should say exactly what is being approved, to whom, and for how much.", hint: "Review typed-data fields: domain, chainId, spender, amount, deadline, nonce. Flag opaque 'Sign in' prompts." },
          { id: "wt13", check: "Unlimited approvals are warned against clearly", plain: "Approving max tokens for a new contract is how many funds get drained.", hint: "Check for unlimited-approval warnings and whether the spender contract is known/verified." },
          { id: "wt14", check: "Unknown or unverified spender is flagged", plain: "Signing for a brand-new contract should trigger a warning.", hint: "Verify the app surfaces unknown-spender and unverified-contract warnings before signing." },
          { id: "wt15", check: "Replay protection is sound across chains and contracts", plain: "A signature valid in two places can be used twice.", hint: "Check domain separation, chainId binding, and nonce/expiry so signatures cannot be replayed cross-chain or cross-contract." },
          { id: "wt16", check: "Transactions are simulated before signing", plain: "A simulated transaction can confirm it succeeds before users commit.", hint: "Confirm wallet simulation is used and its failure/success is reflected in the UI truthfully." }
        ]
      }
    ]
  },
  {
    id: "api",
    label: "REST / GraphQL API",
    short: "Authorization, validation, and business logic.",
    icon: "server",
    groups: [
      {
        name: "Authorization",
        tests: [
          { id: "a01", check: "Object access is per-user (no IDOR / BOLA)", plain: "Anyone should only ever see and act on their own data.", hint: "Swap IDs in requests; confirm users cannot read or mutate other users' objects or modify their own state as another role." },
          { id: "a02", check: "Role boundaries are enforced server-side", plain: "Client-side hiding is not security — the server must check roles.", hint: "Call admin/keeper endpoints as a normal user; confirm server-side role checks, not just hidden buttons." },
          { id: "a03", check: "Mass assignment is blocked", plain: "Extra fields in a request should never set privileged properties.", hint: "Send unexpected fields (isAdmin, owner, balance) in create/update payloads; confirm they are ignored." },
          { id: "a04", check: "JWT / session tokens resist tampering and misuse", plain: "Forged or expired tokens must not grant access.", hint: "Test token alg confusion, weak secrets, expiry, audience/issuer binding, and token reuse after logout." },
          { id: "a05", check: "Rate limiting protects auth and sensitive endpoints", plain: "Unlimited requests let attackers brute-force or scrape freely.", hint: "Confirm limits on login, 2FA, password reset, search, and mint/claim endpoints; check bypasses (X-Forwarded-For)." },
          { id: "a06", check: "CORS is locked down to trusted origins", plain: "A permissive CORS policy lets any site read your API as a logged-in user.", hint: "Review Access-Control-Allow-Origin for wildcards or echo of untrusted Origin; confirm credentials policy." }
        ]
      },
      {
        name: "Data validation",
        tests: [
          { id: "a07", check: "Economic parameters cannot be tampered with", plain: "Amount, recipient, route, and fee fields must come from trusted logic.", hint: "Tamper with amount, recipient, route, quote ID, fee tier, nonce, affiliate, and chainId parameters in requests." },
          { id: "a08", check: "Injection classes are tested (SQL / NoSQL / command / template)", plain: "Unsafe queries and eval can leak or destroy data.", hint: "Test classic injection payloads in search, filters, sort, and name fields; check for error differences." },
          { id: "a09", check: "Unicode, normalization, and homograph attacks are handled", plain: "Lookalike characters can spoof addresses, names, and domains.", hint: "Test IDN homographs in names/domains, Unicode normalization in dedupe/allowlist logic, and punycode in redirects." },
          { id: "a10", check: "URL-fetch features are SSRF-safe", plain: "Features that fetch a URL can be pointed at internal services.", hint: "If the API fetches URLs (metadata, webhooks, previews), test SSRF to internal ranges, cloud metadata, and redirects." },
          { id: "a11", check: "File upload and export paths are validated", plain: "Uploads can carry malware or execute server-side.", hint: "Check extension/MIME/type validation, path traversal on names, and that uploaded files cannot be executed or read by others." },
          { id: "a12", check: "Serialization / parser edge cases do not crash or confuse", plain: "Hostile payloads should fail safely, not wedge the parser.", hint: "Send oversized, nested, duplicate-key, and malformed JSON/GraphQL payloads; watch for resource exhaustion." }
        ]
      },
      {
        name: "Business logic",
        tests: [
          { id: "a13", check: "Quotes and signatures cannot be replayed", plain: "A signed action meant for one moment should not execute twice or later.", hint: "Replay quotes, intents, and signed responses across time, accounts, and environments; check expiry and invalidation." },
          { id: "a14", check: "Idempotency protects state-changing operations", plain: "Repeated requests should not duplicate payments or mints.", hint: "Double-submit create, mint, claim, and withdraw calls; confirm idempotency keys or equivalent guards." },
          { id: "a15", check: "Ordering, pagination, and cursor logic cannot be abused", plain: "Games can be rigged by manipulating how lists and queues are ordered.", hint: "Test pagination/cursor tampering, sort injection, and priority or queue manipulation affecting distribution order." },
          { id: "a16", check: "Webhook callbacks are authenticated and signed", plain: "Anyone who can fake a webhook can fake the event that follows.", hint: "Confirm webhook signature/verification, secret rotation, and that events are not accepted from arbitrary senders." },
          { id: "a17", check: "Indexer-derived data is revalidated for sensitive decisions", plain: "Data from an indexer can lag or lie; sensitive actions must trust the chain.", hint: "Check that balances, ownership, and pool state used for actions are revalidated on-chain or against a trusted source." }
        ]
      }
    ]
  },
  {
    id: "evm",
    label: "EVM Smart Contracts",
    short: "Access control, accounting, and external calls.",
    icon: "layers",
    groups: [
      {
        name: "Access control",
        tests: [
          { id: "e01", check: "Admin, keeper, and privileged functions are guarded", plain: "A function anyone can call that changes fees or moves funds is critical.", hint: "eth_call every state-changing admin/keeper fn (setOwner, setFee, mint, withdraw) from an attacker address; no revert = check." },
          { id: "e02", check: "Role changes use timelocks and clear boundaries", plain: "Instant privileged changes on live positions are a trust risk.", hint: "Check for timelock on owner actions and per-position snapshots/freezes rather than global hot swaps." },
          { id: "e03", check: "Upgradeability and proxy admin are controlled", plain: "An unprotected upgrade path lets an attacker replace the logic.", hint: "Verify proxy admin ownership, upgrade authorization, and that only the timelock/DAO can change implementation." },
          { id: "e04", check: "Pause/unpause cannot be weaponized", plain: "Pausing should protect users, not lock their funds as leverage.", hint: "Check who can pause, whether it is timelocked, and whether pause/deposit/withdraw interactions are coherent." },
          { id: "e05", check: "No owner backdoor on already-live positions", plain: "If the owner can change behavior on live funds, code is not the contract.", hint: "Confirm migrator/oracle/fee/parameter swaps on live positions require timelock or per-position consent." }
        ]
      },
      {
        name: "Accounting & math",
        tests: [
          { id: "e06", check: "Precision, rounding, and overflow are handled correctly", plain: "Rounding the wrong way on every trade is a slow, systematic loss.", hint: "Review rounding direction on deposit/withdraw/swap/fee, integer overflow, and decimal mismatch across assets." },
          { id: "e07", check: "First-depositor / share-inflation is mitigated", plain: "A tiny first deposit plus a donation can steal the next depositor's value.", hint: "Check virtual shares / dead shares / minimum-liquidity patterns in vaults and AMMs." },
          { id: "e08", check: "Oracles resist staleness and manipulation", plain: "A stale or manipulable price breaks every downstream liquidation and swap.", hint: "Check oracle freshness windows, spot vs TWAP, and manipulation resistance at the moment value moves." },
          { id: "e09", check: "Snapshots and distributions resist flash-inflation", plain: "Permissionless snapshotting of live balances can be gamed with a flash loan.", hint: "Confirm snapshots are permissioned/checkpointed, not spot balanceOf; search for fee-free flash sources." },
          { id: "e10", check: "Fee calculations cannot be paid less or extracted more", plain: "Fees that can be skipped or inflated are an economic bug.", hint: "Test fee-on-buy/sell, protocol fee share, and whether anyone can pay less or receive more than designed." },
          { id: "e11", check: "Token-transfer edge cases (rebase, fee-on-transfer, blacklist)", plain: "Some tokens do not behave like the standard — math must match reality.", hint: "Review fee-on-transfer, rebasing, deflationary, and blacklistable token assumptions in balances and minting." }
        ]
      },
      {
        name: "External interactions",
        tests: [
          { id: "e12", check: "External calls are ordered to resist reentrancy", plain: "State must update before untrusted calls return.", hint: "Confirm CEI pattern, guards on callbacks, and that ERC777/ERC1363 hooks cannot re-enter value paths." },
          { id: "e13", check: "Return values and failure modes are checked", plain: "Ignored failures from token transfers silently lose funds.", hint: "Verify checked transfer/transferFrom returns, safe ERC20 wrappers, and handling of ETH send failures." },
          { id: "e14", check: "Signature flows use EIP-712 domains and invalidation", plain: "Underspecified signatures can be replayed or forged by confusion.", hint: "Check domain, chainId, nonce invalidation, deadline, and signer recovery on permit/signature flows." },
          { id: "e15", check: "Cross-contract and callback trust is bounded", plain: "Trusting an untrusted caller's input is how confusion attacks happen.", hint: "Review who can trigger functions, what caller-controlled data flows into state, and external-contract assumptions." },
          { id: "e16", check: "Value moving functions are proven on a fork before reporting", plain: "Only a local fork proves an exploit — speculation is not a finding.", hint: "For each suspected issue, build a fork PoC (forge test --fork-url) that asserts net attacker gain." }
        ]
      }
    ]
  },
  {
    id: "solana",
    label: "Solana Programs",
    short: "Account validation, authority, and CPI safety.",
    icon: "zap",
    groups: [
      {
        name: "Account validation",
        tests: [
          { id: "s01", check: "Every account checks owner, signer, and writable flags", plain: "Unchecked accounts can be swapped for hostile substitutes.", hint: "Confirm owner checks (token/program), signer checks, and writable flags on every account in each instruction." },
          { id: "s02", check: "PDA seeds and bumps are validated", plain: "Wrong seeds or bumps let attackers spoof derived addresses.", hint: "Verify seed derivation and bump are checked with create_program_address / find_program_address, not just stored values." },
          { id: "s03", check: "Account substitution is impossible", plain: "The program must bind accounts to the expected addresses.", hint: "Try substituting token accounts, mints, or authorities; confirm the program validates the account relationships." },
          { id: "s04", check: "Remaining accounts are constrained", plain: "Unchecked extra accounts can be injected into CPI calls.", hint: "Review remaining_accounts usage; confirm length limits and that extra accounts cannot alter instruction behavior." },
          { id: "s05", check: "Reinitialization and close flows are safe", plain: "Reopened or closed accounts can reset authority or leak rent.", hint: "Test reinitialization guard, rent collection on close, and stale account reuse across instructions." }
        ]
      },
      {
        name: "Authority & CPI",
        tests: [
          { id: "s06", check: "No confused-deputy paths", plain: "A program that can make a privileged call on another program's behalf is dangerous.", hint: "Look for CPI calls where signer privileges are passed further than intended; verify the caller is actually the expected program." },
          { id: "s07", check: "CPI target programs cannot be spoofed", plain: "A fake target program receiving a privileged CPI is a drain vector.", hint: "Confirm CPI target program IDs are validated, not just any program with a matching interface." },
          { id: "s08", check: "Authority and signer privileges are scoped", plain: "A signer that has power in one place must not have it everywhere.", hint: "Map every signer/authority to its exact privilege; find cross-instruction authority confusion." },
          { id: "s09", check: "Program upgrade and ownership are protected", plain: "An unaudited upgrade authority is a permanent backdoor.", hint: "Verify upgrade authority and program ownership are a multisig/timelock and not a single EOA." },
          { id: "s10", check: "Clock and slot data cannot be gamed", plain: "Faked timing can unlock claims or manipulate interest.", hint: "Check whether instruction behavior relies on sysvar clock/slot in ways a client could game off-chain." }
        ]
      },
      {
        name: "Accounting",
        tests: [
          { id: "s11", check: "Arithmetic is checked for precision and overflow", plain: "Overflow or rounding bugs corrupt balances and fees.", hint: "Review checked math, rounding direction, and fee/amount calculation in the value paths." },
          { id: "s12", check: "Token decimal assumptions match reality", plain: "Different mints use different decimals — math must use the right scale.", hint: "Verify decimals are read from the mint or metadata, not hardcoded, and used consistently." },
          { id: "s13", check: "Rent, lamports, and SOL flows are correct", plain: "Wrong lamport math can steal rent or strand funds.", hint: "Check rent-exempt lamport requirements, SOL token flows, and close/refund accounting." },
          { id: "s14", check: "Token-2022 and extensions are handled explicitly", plain: "New token extensions can break programs written for legacy tokens.", hint: "If Token-2022 is used, confirm extension-aware handling (transfer hooks, fees, metadata)." },
          { id: "s15", check: "Value paths are proven with a local simulation before reporting", plain: "Simulations prove behavior without touching mainnet.", hint: "Reproduce suspected issues with a local validator/simulation and assert exact account-state changes." }
        ]
      }
    ]
  },
  {
    id: "mobile",
    label: "Mobile / APK",
    short: "Client secrets, exported components, transport.",
    icon: "phone",
    groups: [
      {
        name: "Client secrets",
        tests: [
          { id: "m01", check: "No hardcoded secrets in code, resources, or assets", plain: "Keys baked into the app can be extracted by anyone who downloads it.", hint: "Run jadx/apktool + string grep over the APK for API keys, RPC URLs, JWT secrets, and private keys." },
          { id: "m02", check: "Cloud and Firebase config are not over-exposed", plain: "A readable cloud config can expose database rules and keys.", hint: "Check google-services.json, Firebase rules, and remote config for world-readable data or admin paths." },
          { id: "m03", check: "Debug logs do not leak tokens or PII", plain: "Logcat and crash dumps can carry session data to attackers.", hint: "Search for logging of tokens, keys, credentials, and user PII in debug and release builds." },
          { id: "m04", check: "Certificates and keys are protected", plain: "Bundled private keys or pinned-only certs are dangerous.", hint: "Check for embedded .p12/.keystore, hardcoded pin sets, and unprotected backup of key material." }
        ]
      },
      {
        name: "Components & intents",
        tests: [
          { id: "m05", check: "No unnecessary exported components", plain: "Exported activities/services/receivers can be launched by other apps.", hint: "Audit exported components in the manifest; confirm each has proper permissions and no sensitive intents." },
          { id: "m06", check: "Deep links and intent injection are validated", plain: "A malicious link can hijack a deep-link flow to a fake screen.", hint: "Test custom schemes/universal links for host/path validation, and intents for extra-data injection into privileged flows." },
          { id: "m07", check: "Content providers are permission-protected", plain: "Readable providers expose the app's data store.", hint: "Check exported providers for path traversal and that sensitive databases are not world-readable." },
          { id: "m08", check: "WebViews are locked down", plain: "WebViews that allow file access or JS bridges are an attack surface.", hint: "Confirm setJavaScriptEnabled/allowFileAccess settings, scheme allowlists, and untrusted-URL handling." },
          { id: "m09", check: "Backup and data-export flags are safe", plain: "Backed-up data can be extracted from the device.", hint: "Check android:allowBackup, dataExtractionRules, and fullBackupContent for sensitive data exposure." }
        ]
      },
      {
        name: "Transport",
        tests: [
          { id: "m10", check: "Certificate pinning is present for critical endpoints", plain: "Pinning stops a compromised CA from impersonating your API.", hint: "Verify pinning on auth/transaction endpoints and that pins have rotation paths." },
          { id: "m11", check: "No cleartext traffic for sensitive flows", plain: "HTTP without TLS exposes credentials and data in transit.", hint: "Check usesCleartextTraffic and per-domain network config for HTTPS enforcement." },
          { id: "m12", check: "App integrity and tamper detection exist", plain: "Repackaged apps can be used to phish real users.", hint: "Check signature verification, integrity SDKs, and what happens when the app is repackaged or run in a fake environment." },
          { id: "m13", check: "Third-party SDK data exposure is bounded", plain: "Analytics and tracking SDKs can leak sensitive flows.", hint: "Map which SDKs see what data; flag SDKs receiving transaction, wallet, or credential data without review." }
        ]
      }
    ]
  },
  {
    id: "llm",
    label: "LLM / Prompt Injection",
    short: "Jailbreak, indirect injection, and guardrails.",
    icon: "spark",
    groups: [
      {
        name: "Prompt safety",
        tests: [
          { id: "l01", check: "System prompt resists direct jailbreak attempts", plain: "Users should not be able to override your instructions by asking.", hint: "Attempt 'ignore previous instructions', 'you are now DAN', role-swap, and instruction-override prompts against the live assistant." },
          { id: "l02", check: "Indirect injection via fetched content is contained", plain: "A website you ask the AI to read can try to take over the conversation.", hint: "Fetch attacker-controlled pages/webhooks/documents into the model; confirm embedded instructions are treated as data, not commands." },
          { id: "l03", check: "Encoding and payload-smuggling evasions fail", plain: "Base64, emoji, homoglyphs, and multi-turn setups should not bypass filters.", hint: "Test encoding obfuscation, Unicode tricks, incremental jailbreak, and competing-goals prompts." },
          { id: "l04", check: "Multi-turn memory cannot be poisoned for later abuse", plain: "A conversation can be steered early to hijack a later privileged action.", hint: "Test prompt-injection in early turns that later triggers a tool call or privileged instruction." },
          { id: "l05", check: "Roleplay and persona-reversal cannot leak system directives", plain: "Pretending to be a chatbot should not reveal your internal rules.", hint: "Ask the model to act as its developer and reveal system prompt, API structure, or hidden instructions." }
        ]
      },
      {
        name: "Data flow",
        tests: [
          { id: "l06", check: "PII and sensitive data are filtered before/after the model", plain: "User data sent to a model or shown in output must be scoped.", hint: "Confirm input sanitization of PII and output filtering that prevents model echo of secrets, keys, or personal data." },
          { id: "l07", check: "Tool and function-call abuse is limited", plain: "If the model can call tools, jailbreaks become system access.", hint: "Verify allowlisted tools, parameter constraints, and that tool calls cannot exfiltrate or mutate beyond scope." },
          { id: "l08", check: "Exfiltration via outputs and links is blocked", plain: "A model that echoes secrets into the chat leaks them to the user.", hint: "Test for extraction of internal data, secrets, or other users' content via prompts and output channels." },
          { id: "l09", check: "Training-data and model-internal exposure is resisted", plain: "Prompts should not pull hidden model details into the answer.", hint: "Probe for memorized training data, hidden system content, and internal identifiers." }
        ]
      },
      {
        name: "Guardrails",
        tests: [
          { id: "l10", check: "Human-in-the-loop guards privileged actions", plain: "Risky actions should require a person, not just the model.", hint: "Confirm privileged tool actions (pay, approve, mint, admin) require explicit user confirmation with a clear description." },
          { id: "l11", check: "Input and output moderation is enforced", plain: "A content filter catches jailbreaks and dangerous outputs.", hint: "Verify moderation on inputs and outputs and that filtered actions are blocked end-to-end, not just hidden." },
          { id: "l12", check: "Rate limits and abuse detection apply to the LLM path", plain: "Free LLM access is a cost and abuse vector.", hint: "Check quotas, per-user limits, and anomaly detection on the model endpoints and their tool side-effects." },
          { id: "l13", check: "System prompt and tool config are not user-influenced", plain: "User input should never reach the system layer.", hint: "Confirm separation between system instructions and user content, and that tools cannot modify their own configuration." }
        ]
      }
    ]
  },
  {
    id: "infra",
    label: "Infrastructure & Trust",
    short: "Transport security, hosting, and operations.",
    icon: "shield",
    groups: [
      {
        name: "Transport security",
        tests: [
          { id: "i01", check: "HTTPS is enforced and HSTS is set", plain: "Unencrypted traffic lets anyone on the network read or modify it.", hint: "Verify redirect-to-HTTPS, HSTS header, and that all subdomains/APIs enforce TLS." },
          { id: "i02", check: "TLS versions and certificates are current", plain: "Old TLS or expired certs are a trust and integrity risk.", hint: "Check TLS version, certificate validity, and cipher configuration on all endpoints." },
          { id: "i03", check: "No mixed content on any page", plain: "Loading scripts over HTTP inside an HTTPS page weakens the whole session.", hint: "Scan pages for http:// subresources and http links in the bundle." },
          { id: "i04", check: "Certificate errors are treated as fatal", plain: "Ignoring bad certs defeats the entire transport trust model.", hint: "Review client certificate-validation bypasses and in-app SSL exception handling." }
        ]
      },
      {
        name: "Hosting",
        tests: [
          { id: "i05", check: "Server and framework banners are not disclosed", plain: "Version banners tell attackers exactly which exploits to try.", hint: "Check Server headers, framework errors, and API responses for version and technology disclosure." },
          { id: "i06", check: "No exposed admin, debug, or staging surfaces", plain: "A public admin panel or debug endpoint is an open door.", hint: "Probe common admin/staging paths, debug routes, and unauthenticated status/health endpoints." },
          { id: "i07", check: "Default credentials and open ports are not present", plain: "Default logins are the easiest breach there is.", hint: "Check for default creds on services, open management ports, and unprotected databases/caches." },
          { id: "i08", check: "Backup, build, and deployment artifacts are not public", plain: "A leaked .env or backup file exposes everything.", hint: "Probe for .env, .git, backups, and deployment artifacts on the origin and CDN." }
        ]
      },
      {
        name: "Operational",
        tests: [
          { id: "i09", check: "Secrets are not committed or in plaintext config", plain: "A secret in a repo is a secret that is already public.", hint: "Review git history, env templates, and CI config for keys, tokens, and passwords." },
          { id: "i10", check: "Key management and rotation exist for signing keys", plain: "Signing keys without rotation or custody are a single point of failure.", hint: "Confirm custody, rotation, and revocation paths for private keys used to sign or administer." },
          { id: "i11", check: "Monitoring and alerting cover value-moving flows", plain: "If you cannot see the attack, you cannot stop it.", hint: "Check alerting on unusual withdrawals, large transfers, privilege changes, and failed-signature spikes." },
          { id: "i12", check: "Dependency and CVE policy is enforced", plain: "Known-vulnerable dependencies are the cheapest attack.", hint: "Verify automated dependency scanning and a policy for patching high-severity CVEs." }
        ]
      }
    ]
  }
];

const SEVERITY_MODEL = [
  { label: "Critical", color: "#b3261e", weight: 10, def: "Direct theft, permanent loss, protocol insolvency, unauthorized privileged control, or reliable cross-user compromise." },
  { label: "High", color: "#d1443c", weight: 8, def: "Loss or lockup requiring specific conditions, strong exploit path, serious authorization bypass, or harmful transactions users are likely to sign." },
  { label: "Medium", color: "#b46900", weight: 5, def: "Meaningful financial, integrity, or availability impact with constraints or user interaction." },
  { label: "Low", color: "#2f7d32", weight: 2, def: "Limited impact, hard-to-exploit bug, misleading behavior, weak validation, or local inconsistency." },
  { label: "Informational", color: "#5a6670", weight: 1, def: "Hardening note, test gap, observability gap, or developer-experience issue." }
];

const STATUSES = ["Open", "In review", "Fixed", "Accepted risk", "By design"];

const OWNERS = [
  "Frontend",
  "Backend / API",
  "EVM",
  "Solana",
  "Mobile",
  "LLM / AI",
  "Infrastructure",
  "Product",
  "Unassigned"
];

const OPERATING_RULES = [
  { title: "Fork & read-only verification", body: "Only local forks, eth_call, simulations, and read-only queries prove a finding. Never move real funds or trigger live exploits." },
  { title: "Honest severity", body: "State the bound: affected funds, required permissions, prerequisites, frequency, and blast radius. A Medium is a Medium." },
  { title: "Private disclosure", body: "Report through a private channel and keep reports, PoCs, and repos private until the issue is fixed. Never publish a live, unpatched bug." },
  { title: "No extortion", body: "Ask, never threaten. Payment is never a condition for disclosure or a fix." },
  { title: "Kill your own findings", body: "Disprove your own work before believing it. Report hardening gaps, not speculation, when no exploit is proven." },
  { title: "Secrets stay out", body: "Private keys, seed phrases, tokens, and user data never go into reports or evidence." }
];

const ENVIRONMENTS = [
  "Testnet / staging",
  "Local fork",
  "Mainnet read-only",
  "Production with written authorization"
];

const DEFAULT_SCOPE_SAMPLE =
  "Wallet connect, quote preview, transaction simulation, API review, contract/program integration review.";

const DEFAULT_ASSUMPTIONS_SAMPLE =
  "No destructive mainnet transactions. Use test wallets and sanitized evidence.";
