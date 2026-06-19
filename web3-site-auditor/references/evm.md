# EVM Audit Reference

Use this reference for Ethereum, L2, EVM-compatible chains, Solidity, Vyper, contract ABIs, and frontend flows that prepare EVM transactions.

## Frontend and Wallet Flow

- Confirm the dApp rejects unsupported chain IDs and refreshes quotes, approvals, balances, and transaction calldata after a network switch.
- Check that token decimals, native token wrapping, allowance amounts, slippage, deadlines, recipient addresses, and spender addresses are displayed accurately.
- Verify the UI does not reuse stale calldata after route, amount, token, account, or chain state changes.
- Inspect whether failed, replaced, reverted, or dropped transactions are shown truthfully.
- Check if permit signatures, typed data, and transaction copy clearly identify spender, recipient, amount, deadline, nonce, and domain.

## Backend, API, and Indexing

- Test whether API parameters can be tampered with to alter recipient, amount, route, quote, nonce, fee tier, affiliate address, or chain ID.
- Check if signed quotes or intents include domain separation, expiration, chain ID, verifying contract, user address, and all economic parameters.
- Verify indexer data is not treated as authoritative for security-critical decisions.
- Look for replay across chains, environments, contracts, accounts, and nonces.

## Contract Integration

- Review calls for unsafe approvals, unlimited approvals without warning, unchecked return values, incorrect token assumptions, fee-on-transfer handling, and reentrancy-sensitive ordering.
- Check access control on admin, pausing, upgrade, fee, oracle, withdrawal, bridge, or keeper functions.
- Inspect math for precision loss, rounding direction, stale oracle data, decimal mismatch, and overflow assumptions.
- Verify signature flows use proper EIP-712 domains, nonce invalidation, deadline checks, and signer recovery.
- Validate external calls, callbacks, hooks, ERC777/ERC1363 behavior, flash loan paths, and cross-contract trust assumptions.

## Evidence to Capture

- Contract address, function name, calldata summary, transaction hash or simulation trace.
- Exact account, chain ID, token addresses, amounts, decimals, quote ID, and timestamp.
- Code references for root cause and a minimal reproduction path.
