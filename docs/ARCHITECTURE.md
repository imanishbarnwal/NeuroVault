# NeuroVault — Technical Architecture

## System Overview

NeuroVault is a privacy-preserving neural data marketplace built as a monorepo with three packages:

1. **`apps/web`** — Next.js 14 frontend (App Router, client + server components)
2. **`packages/eeg-utils`** — Shared EEG data processing library (TypeScript)
3. **`contracts/`** — Smart contracts for Flow (Solidity + Cadence) and NEAR (near-sdk-js)

All integrations support dual-mode operation (real + demo fallback) for development flexibility.

## Data Flow

### Upload Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                         UPLOAD PIPELINE                             │
└─────────────────────────────────────────────────────────────────────┘

  User selects .edf file
       │
       ▼
  ┌──────────────┐
  │  EDF+ Parser │  packages/eeg-utils/src/parser.ts
  │  (in-browser)│  - Reads 256-byte fixed header
  │              │  - Extracts signal data per channel
  │              │  - Converts digital → physical units (µV)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  Feature     │  packages/eeg-utils/src/features.ts
  │  Extraction  │  - FFT band power (Delta/Theta/Alpha/Beta/Gamma)
  │              │  - Channel statistics (mean, variance, kurtosis)
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  Access      │  apps/web/components/upload/AccessConditionBuilder.tsx
  │  Conditions  │  - Wallet, NFT, Token, Timelock, World ID
  │  (Lit Rules) │  - AND/OR composition
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │ Lit Protocol │  apps/web/lib/lit.ts
  │  Encrypt     │  - Threshold encryption via datil-dev network
  │              │  - Conditions embedded in ciphertext envelope
  │              │  - Demo: Web Crypto AES-GCM fallback
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │   Storacha   │  apps/web/lib/storacha.server.ts
  │   Upload     │  - Encrypted data blob → CID₁
  │  (Filecoin)  │  - Metadata JSON → CID₂
  │              │  - Registry update → CID₃
  └──────┬───────┘
         │
         ▼
  ┌──────────────┐
  │  Flow EVM    │  contracts/flow/solidity/contracts/NeuroVaultRegistry.sol
  │  Register    │  - registerDataset(CID₁, CID₂, price)
  │              │  - Emits DatasetRegistered event
  │              │  - Returns dataset ID
  └──────────────┘
```

### Discovery & Access Pipeline

```
┌─────────────────────────────────────────────────────────────────────┐
│                    DISCOVERY & ACCESS PIPELINE                      │
└─────────────────────────────────────────────────────────────────────┘

  Researcher enters search query
       │
       ├─────────────────────────────┐
       │                             │
       ▼                             ▼
  ┌──────────────┐            ┌──────────────┐
  │  NEAR AI     │            │  Direct      │
  │  Matching    │            │  Browsing    │
  │              │            │              │
  │  submit_     │            │  Flow EVM    │
  │  query()     │            │  listDatasets│
  └──────┬───────┘            └──────┬───────┘
         │                           │
         ▼                           │
  ┌──────────────┐                   │
  │  Scoring     │                   │
  │  Engine      │                   │
  │  ┌─────────┐ │                   │
  │  │Channels │ │ 25%               │
  │  │Duration │ │ 20%               │
  │  │Task     │ │ 30%               │
  │  │Text     │ │ 25%               │
  │  └─────────┘ │                   │
  └──────┬───────┘                   │
         │                           │
         ▼                           │
  ┌──────────────┐                   │
  │  store_match │                   │
  │  _results()  │                   │
  │  (on-chain)  │                   │
  └──────┬───────┘                   │
         │                           │
         └───────────┬───────────────┘
                     │
                     ▼
              ┌──────────────┐
              │  Dataset     │
              │  Selected    │
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │  Flow EVM    │  purchaseAccess(datasetId) payable
              │  Purchase    │  - Transfers FLOW to contributor
              │              │  - Creates 30-day license
              │              │  - Emits AccessGranted event
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │ Lit Protocol │  Decrypt with session signatures
              │  Decrypt     │  - Checks on-chain conditions
              │              │  - Threshold decryption from nodes
              └──────┬───────┘
                     │
                     ▼
              ┌──────────────┐
              │  EEG Viewer  │  Canvas-based waveform display
              │  + ML Class  │  Impulse AI / ERD classification
              └──────────────┘
```

## Integration Details

### Storacha / Filecoin

**Authentication:**
- Ed25519 agent key pair generated via `storacha key create`
- UCAN delegation proof grants the agent permission to write to a specific space
- The agent DID (derived from private key) must match the audience in the delegation proof

**Storage Model:**
- Each upload creates two separate blobs on Filecoin:
  1. Encrypted EEG data (Lit Protocol ciphertext + envelope metadata)
  2. Metadata JSON (channels, duration, task type, features, access conditions)
- A registry JSON file tracks all datasets (updated via CID replacement)
- All CIDs are content-addressed — changing any byte produces a different CID

**Proof of Storage:**
- The platform queries Filecoin deal status via Storacha's API
- Displays deal ID, miner, start/expiry epochs, and deal status
- Users can independently verify storage on Filecoin explorers

**Key Implementation Pattern:**
```
storacha.server.ts (SERVER-ONLY)
├── getClient() → Singleton Storacha client with UCAN auth
├── uploadEncryptedEEG() → Upload encrypted blob + metadata
├── loadRegistry() / saveRegistry() → Dataset registry CRUD
├── listDatasets() → Read registry entries
└── getStorageProof() → Query Filecoin deal status
```

### Lit Protocol

**Encryption Model:**
- Uses Lit Protocol's threshold cryptography — data is encrypted such that no single node can decrypt
- Access conditions are EVM-based (evaluated against on-chain state)
- Conditions are embedded in the `EncryptedEnvelope` alongside the ciphertext

**Supported Condition Types:**

| Type | Evaluates | Example |
|------|-----------|---------|
| Wallet | `msg.sender == address` | Only specific address can decrypt |
| NFT Gate | `balanceOf(addr) >= 1` | Must hold a specific NFT |
| Token Gate | `balanceOf(addr) >= amount` | Must hold minimum token balance |
| Timelock | `block.timestamp >= time` | Data unlocks after a date |
| Flow Access | `checkAccess(addr, id)` on NeuroVaultRegistry | Must have on-chain license |
| World ID | Timestamp placeholder | App-level personhood check |

**Condition Composition:**
- Conditions can be combined with AND/OR boolean operators
- Example: `(wallet_check AND nft_gate) OR flow_access`

**Demo Fallback:**
- When Lit Protocol is unavailable, encryption uses Web Crypto AES-GCM
- A random 256-bit key is generated and stored alongside the ciphertext
- This allows full UI testing without Lit network connectivity

### Flow Blockchain (EVM)

**Contract: NeuroVaultRegistry.sol**

```solidity
// Core state
mapping(uint256 => Dataset) public datasets;
mapping(address => mapping(uint256 => License)) public licenses;
mapping(address => uint256) public contributorEarnings;

// Core functions
registerDataset(dataCID, metadataCID, price) → datasetId
purchaseAccess(datasetId) payable → license (30 days)
checkAccess(user, datasetId) view → bool
```

**Security:**
- Inherits `Ownable` (OpenZeppelin) and `ReentrancyGuard`
- Payment function uses `call{value}` with reentrancy protection
- Overpayment automatically refunded to buyer
- Contributors always get paid before license is created

**Cross-VM Composability:**
- A Cadence script (`ReadNeuroVaultRegistry.cdc`) demonstrates reading Solidity state from Cadence
- Uses `EVM.run()` to execute ABI-encoded calls against the EVM contract
- No bridges or relayers — native Flow cross-VM capability

**Frontend Pattern:**
```
lib/flow.ts (DUAL-MODE)
├── initFlow() → Smoke-test contract, set demo mode if needed
├── connectWallet() → BrowserProvider + chain switching (545)
├── registerDatasetOnChain() → Signed transaction, parse events
├── purchaseAccess() → Read price, send payment
├── checkAccess() → Read-only contract call
├── getContributorStats() → Parallel earnings + datasets query
└── listOnChainDatasets() → Read-only batch query
```

### NEAR Protocol

**Contract: DatasetMatcher (neurovault-matcher.testnet)**

```typescript
// On-chain structures
MatchQuery { naturalLanguage, minChannels, maxChannels, taskType, ... }
MatchResult { datasetId, overallScore, channelScore, durationScore, taskScore, textScore }

// Callable methods
submit_query(params) → queryId
store_match_results(queryId, results) → void

// View methods
get_matches(queryId) → MatchResult[]
get_recent_queries(limit) → MatchQuery[]
get_query_count() → number
```

**Scoring Algorithm:**
The matching engine scores each dataset against the query on 4 weighted dimensions:
- **Channel Compatibility (25%):** How well the dataset's channel count matches the query range
- **Duration Match (20%):** How well the recording duration fits the requested range
- **Task Relevance (30%):** Exact/partial/no match against task type
- **Text Similarity (25%):** Keyword overlap between query and dataset description

**Transparency:**
- All queries and results are stored on-chain
- Anyone can audit how datasets were scored
- Recent queries are browsable (capped at 50)

### World ID

**Verification Flow:**
```
1. User clicks "Verify with World ID"
2. IDKitWidget opens (client-side ZK proof generation)
3. Proof submitted to /api/verify-world-id
4. Server validates against World Developer Portal API
5. Nullifier hash stored in localStorage (anonymous)
6. UI shows verified badge
```

**Sybil Prevention:**
- Each unique human can only verify once per action
- Nullifier hash prevents duplicate verifications
- Can be required as a Lit Protocol access condition
- Upload and purchase flows include optional verification gates

## Security Model

| Threat | Mitigation |
|--------|-----------|
| Data breach (server) | Data never exists in plaintext on any server. Client-side encryption before upload. |
| Unauthorized access | Lit Protocol threshold decryption requires on-chain condition satisfaction. |
| Payment manipulation | ReentrancyGuard on Flow contract. Contributor paid before license created. |
| Sybil attacks | World ID proof-of-personhood. Unique nullifier hash per human. |
| Data tampering | Content-addressed CIDs on Filecoin. Any modification changes the hash. |
| Key compromise | Lit Protocol distributes decryption across multiple nodes. No single key to steal. |
| Front-running | Flow EVM transaction ordering. Standard blockchain guarantees apply. |

## Dual-Mode Architecture

Every integration supports a demo fallback for development and testing:

| Component | Real Mode | Demo Mode |
|-----------|-----------|-----------|
| Storacha | Filecoin network upload | Mock CIDs returned |
| Lit Protocol | datil-dev threshold encryption | Web Crypto AES-GCM |
| Flow | ethers v6 + Flow EVM RPC | In-memory dataset array |
| NEAR | near-api-js contract calls | Local Map storage |
| Impulse AI | API endpoint inference | Built-in ERD classifier |
| World ID | IDKitWidget + server validation | Auto-verify bypass |

Demo mode activates automatically when environment variables are missing or blockchain connections fail. This allows the complete UI to be demonstrated without any infrastructure dependencies.

## Build & Deployment

```
Turborepo Pipeline
├── @neurovault/eeg-utils     → TypeScript compilation (tsc)
├── @neurovault/web           → Next.js build (depends on eeg-utils)
├── flow-contracts            → Hardhat compile (standalone)
└── near-contract             → near-sdk-js build → WASM
```

**Production deployment:** The Next.js app can be deployed to any edge platform (Vercel, Cloudflare Pages). Smart contracts are already deployed to testnets. Environment variables configure the connection to live infrastructure.
