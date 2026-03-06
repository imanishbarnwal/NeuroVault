# NeuroVault Cadence Scripts

## Cross-VM Composability

Flow uniquely supports **cross-VM composability** — Cadence scripts can natively read and interact with Solidity contracts deployed on Flow EVM, without bridges or relayers.

### ReadNeuroVaultRegistry.cdc

This script demonstrates reading the `nextDatasetId` from the `NeuroVaultRegistry` Solidity contract directly from Cadence using `EVM.run()`.

#### How it works

1. Takes the deployed registry's EVM address as input
2. ABI-encodes a call to `nextDatasetId()` (selector `0xc086f6b4`)
3. Uses `EVM.run()` to execute a read-only call against the Solidity contract
4. Decodes the returned `uint256` value

#### Running the script

```bash
flow scripts execute scripts/ReadNeuroVaultRegistry.cdc \
  --arg String:"0xYOUR_DEPLOYED_CONTRACT_ADDRESS" \
  --network testnet
```

> **Note:** The `EVM.run()` API is experimental and may change in future Flow releases. Refer to the [Flow EVM documentation](https://developers.flow.com/evm/cadence/interacting-with-coa) for the latest API.
