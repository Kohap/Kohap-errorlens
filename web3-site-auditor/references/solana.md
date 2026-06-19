# Solana Audit Reference

Use this reference for Solana dApps, Anchor programs, raw Solana programs, wallets, IDLs, program-derived addresses, and transaction-building flows.

## Frontend and Wallet Flow

- Confirm the dApp handles wallet disconnect, account change, cluster mismatch, blockhash expiration, simulation failure, and partial signing clearly.
- Check that transaction previews explain writable accounts, signer accounts, lamports, token mints, token accounts, program IDs, and compute budget changes.
- Verify UI state refreshes after wallet, route, mint, amount, slippage, priority fee, or cluster changes.
- Inspect whether associated token accounts, wrapped SOL flows, rent, and token decimals are represented accurately.

## Backend, API, and Indexing

- Test whether API responses can inject unsafe account metas, program IDs, lookup tables, mints, destinations, or priority fees.
- Check that off-chain signed messages include domain separation, cluster, program ID, user public key, expiration, nonce, and all economic parameters.
- Verify indexer-derived balances, ownership data, and pool state are revalidated on-chain before sensitive actions.

## Program Integration

- Confirm every account has the correct owner, signer, writable flag, seed derivation, bump, mint, authority, and relationship constraint.
- Check for account substitution, missing PDA seed validation, unchecked remaining accounts, confused deputy paths, and CPI target spoofing.
- Review arithmetic for precision, rounding, overflow, fee calculation, and token decimal assumptions.
- Inspect initialization and close flows for reinitialization, rent theft, authority confusion, and stale account reuse.
- Verify token program assumptions, including Token-2022 extensions when supported.

## Evidence to Capture

- Program ID, instruction name, account list, signer/writable flags, transaction signature or simulation output.
- IDL or source reference, PDA seeds, mint addresses, token account addresses, cluster, and slot.
- Minimal reproduction path from UI action to transaction instruction.
