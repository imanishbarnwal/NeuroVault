# NeuroVault — Privacy-Preserving Neural Data Commons

A decentralized platform for securely storing, sharing, and monetizing brain-computer interface (BCI) research data. NeuroVault combines encrypted storage on Filecoin, programmable access control via Lit Protocol, on-chain licensing on Flow & NEAR, and proof-of-personhood via World ID — creating the first privacy-first marketplace for neural data.

## The Problem

Brain-computer interface research generates massive amounts of sensitive neural data, but current sharing infrastructure is broken. Researchers store EEG recordings on centralized servers with no encryption, no access control, and no way for data contributors to earn from their contributions. Existing platforms like PhysioNet provide open access but offer no privacy guarantees, no monetization path, and no way to verify that data consumers are legitimate researchers rather than bad actors. This creates a chilling effect: most neural data never gets shared at all.

## Our Solution

NeuroVault solves this with a fully decentralized pipeline. EEG data is parsed in-browser, encrypted client-side using Lit Protocol access conditions, and stored immutably on Filecoin via Storacha — no server ever sees plaintext neural data. Smart contracts on Flow handle dataset registration, 30-day access licenses, and automatic contributor payments. NEAR Protocol powers an AI-driven dataset matching engine that helps researchers find relevant data using natural language queries. World ID prevents Sybil attacks by requiring proof-of-personhood for uploads and purchases. Every component has a demo fallback, so the platform runs fully functional without any blockchain configuration.

## Architecture

```
                                    NeuroVault Architecture
 ___________________________________________________________________________________________
|                                                                                           |
|   Browser (Next.js 14)                                                                    |
|   ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐  |
|   │ EDF+ Parser │  │ Lit Protocol │  │   Storacha   │  │  Flow EVM   │  │  World ID   │  |
|   │ (eeg-utils) │  │  Encryption  │  │  Upload SDK  │  │   ethers    │  │   IDKit     │  |
|   └──────┬──────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  └──────┬──────┘  |
|          │                │                  │                  │                │         |
|__________|________________|__________________|__________________|________________|_________|
           │                │                  │                  │                │
           ▼                ▼                  ▼                  ▼                ▼
    ┌─────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐
    │  EEG Data   │  │ Lit datil-   │  │   Filecoin   │  │ Flow EVM    │  │ World Dev   │
    │  Features   │  │ dev Network  │  │   Network    │  │ Testnet     │  │ Portal API  │
    │  & Signals  │  │              │  │  (w3s.link)  │  │ (Chain 545) │  │             │
    └─────────────┘  └──────────────┘  └──────────────┘  └──────┬──────┘  └─────────────┘
                                                                │
                     ┌──────────────┐  ┌──────────────┐         │
                     │  NEAR AI     │  │ Impulse AI   │         │
                     │  Matching    │◄─┤  Classifier  │  NeuroVaultRegistry.sol
                     │  (testnet)   │  │  (fallback)  │  ├─ registerDataset()
                     └──────────────┘  └──────────────┘  ├─ purchaseAccess()
                                                         ├─ checkAccess()
                                                         └─ auto-pay contributors
```

## Sponsor Integrations

### Storacha / Filecoin — Decentralized Storage

NeuroVault uses Storacha as the primary storage layer for all encrypted EEG data and metadata. When a researcher uploads a dataset, the encrypted blob and its metadata JSON are stored separately on Filecoin via Storacha's UCAN-authenticated client SDK. Each upload returns content-addressed CIDs that serve as permanent, tamper-proof references. The platform maintains a dataset registry (also stored on Storacha) that maps CIDs to on-chain records. We query Filecoin deal status to display storage proofs in the UI, giving users verifiable evidence that their data is persisted across the network.

**Key files:** `apps/web/lib/storacha.server.ts`, `apps/web/app/api/storage/`

### Lit Protocol — Programmable Encryption

All EEG data is encrypted client-side before upload using Lit Protocol's threshold encryption network. Contributors define EVM-based access conditions when uploading: wallet address checks, NFT ownership gates, ERC-20 token balance requirements, timelock conditions, or on-chain Flow access verification. These conditions are evaluated by Lit's decentralized node network — no single party can decrypt data. The platform supports composing multiple conditions with AND/OR operators, and includes a World ID condition for proof-of-personhood requirements.

**Key files:** `apps/web/lib/lit.ts`, `apps/web/components/upload/AccessConditionBuilder.tsx`

### Flow — On-Chain Registry, Licensing & Payments

The `NeuroVaultRegistry` Solidity contract (deployed to Flow EVM Testnet, Chain 545) is the economic backbone. It handles dataset registration (mapping CIDs to contributor addresses and prices), 30-day access license issuance, and automatic contributor payments using `ReentrancyGuard` for security. When a researcher purchases access, the FLOW payment goes directly to the contributor with overpayment refunded. We also demonstrate Flow's cross-VM composability with a Cadence script that reads Solidity contract state natively — no bridges required.

**Key files:** `contracts/flow/solidity/contracts/NeuroVaultRegistry.sol`, `contracts/flow/cadence/scripts/ReadNeuroVaultRegistry.cdc`, `apps/web/lib/flow.ts`

### NEAR Protocol — AI-Powered Dataset Matching

NEAR hosts the `DatasetMatcher` contract (deployed to `neurovault-matcher.testnet`) which provides transparent, on-chain AI dataset discovery. Researchers submit natural language queries with optional filters (channel count, duration, task type). An off-chain matching engine scores all available datasets on four dimensions — channel compatibility (25%), duration match (20%), task relevance (30%), and text similarity (25%) — then stores results on-chain for auditability. This creates a verifiable record of how datasets were ranked, preventing opaque algorithmic bias.

**Key files:** `contracts/near/src/contract.ts`, `apps/web/lib/near.ts`, `apps/web/app/api/match/`

### World ID — Proof of Personhood

World ID integration prevents Sybil attacks on the platform. Users verify their unique humanity via the IDKitWidget (using World ID's zero-knowledge proof system), and the proof is validated server-side against the World Developer Portal API. Verified status is shown as a badge in the navbar and can be required as an access condition for datasets. The nullifier hash provides a unique anonymous identifier without revealing the user's real identity.

**Key files:** `apps/web/lib/worldid.ts`, `apps/web/app/api/verify-world-id/route.ts`, `apps/web/components/WorldIDButton.tsx`

### Impulse AI — Motor Imagery Classification

The platform includes an AI-powered EEG classifier that detects motor imagery patterns (left-hand, right-hand, or resting state) from uploaded brain recordings. It integrates with the Impulse AI API for inference, with a sophisticated built-in fallback: an Event-Related Desynchronization (ERD) classifier that analyzes mu (8-13 Hz) and beta (13-30 Hz) band power across motor cortex channels (C3, C4, FC3, FC4) using a custom Cooley-Tukey FFT implementation.

**Key files:** `apps/web/lib/impulse.ts`, `apps/web/components/explore/MLClassifier.tsx`

## Demo

*Video link will be added before submission*

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9

### Quick Start

```bash
# Clone the repo
git clone https://github.com/imanishbarnwal/NeuroVault.git
cd NeuroVault

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# (Optional) Fill in your keys — the app runs in demo mode without them

# Build the EEG utilities package
pnpm --filter @neurovault/eeg-utils build

# Start development server
pnpm dev
```

The app runs at `http://localhost:3000`. All integrations have demo fallbacks — you can explore the full UI without configuring any blockchain keys.

### Smart Contracts

```bash
# Flow (Solidity) — compile and test
cd contracts/flow/solidity
npm install
npx hardhat compile
npx hardhat test

# Deploy to Flow EVM Testnet
npx hardhat run scripts/deploy.ts --network flowTestnet

# NEAR — build
cd contracts/near
npm install
npm run build
```

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Next.js 14, React 18, TypeScript | App framework |
| Styling | Tailwind CSS, Space Grotesk + Inter | Dark theme UI |
| Storage | Storacha / Filecoin | Decentralized encrypted data storage |
| Encryption | Lit Protocol (datil-dev) | Programmable, threshold-encrypted access control |
| Payments | Flow EVM (Solidity, ethers v6) | On-chain registry, licensing, contributor payments |
| Discovery | NEAR Protocol (near-sdk-js) | AI-powered dataset matching with on-chain scoring |
| Identity | World ID (@worldcoin/idkit) | Zero-knowledge proof of personhood |
| AI/ML | Impulse AI + built-in ERD | Motor imagery classification from EEG data |
| EEG Processing | @neurovault/eeg-utils | EDF+ parsing, FFT, band power extraction |
| Charts | Recharts | Earnings visualization, band power charts |
| Notifications | Sonner | Toast notifications for user actions |
| Monorepo | Turborepo + pnpm workspaces | Build orchestration |

## Project Structure

```
neurovault/
├── apps/web/                    # Next.js 14 frontend (App Router)
│   ├── app/                     # Pages: dashboard, upload, explore, profile
│   ├── components/              # React components (layout, EEG, upload, explore)
│   ├── hooks/                   # Custom hooks (useFlow, useLitProtocol, useNEAR, useWorldID)
│   ├── lib/                     # Integration modules (flow, lit, storacha, near, impulse, worldid)
│   └── types/                   # TypeScript type definitions
├── contracts/
│   ├── flow/solidity/           # NeuroVaultRegistry.sol (Hardhat + OpenZeppelin v5)
│   ├── flow/cadence/            # Cross-VM Cadence script
│   └── near/                    # DatasetMatcher contract (near-sdk-js)
├── packages/eeg-utils/          # EDF+ parser, FFT, feature extraction
└── docs/                        # Architecture documentation
```

## Team

- **Manish Barnwal** — [@imanishbarnwal](https://github.com/imanishbarnwal)

## License

MIT

---

**Built for [PL Genesis: Frontiers of Collaboration](https://plgenesis.com)**
Track: Fresh Code | Neurotech
