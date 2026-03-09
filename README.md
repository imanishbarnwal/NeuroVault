<div align="center">

# NEUROVAULT

### *Privacy-Preserving Neural Data Commons*

**Upload EEG data. Encrypt it. Store on Filecoin. Earn from researchers.**

[![Status](https://img.shields.io/badge/Status-LIVE-brightgreen?style=for-the-badge)](#)
[![Flow](https://img.shields.io/badge/Chain-Flow_EVM-00EF8B?style=for-the-badge)](https://flow.com)
[![NEAR](https://img.shields.io/badge/Chain-NEAR-000000?style=for-the-badge)](https://near.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

[Live App](#getting-started) &nbsp;|&nbsp; [Architecture](docs/ARCHITECTURE.md) &nbsp;|&nbsp; [GitHub](https://github.com/imanishbarnwal/NeuroVault)

</div>

---

## What is NeuroVault?

A decentralized marketplace for securely storing, sharing, and monetizing brain-computer interface (BCI) research data. EEG recordings are encrypted client-side, stored on Filecoin, and licensed on-chain, so researchers earn from their data while keeping full privacy control.

## The Problem

Brain-computer interface research produces massive amounts of sensitive neural data, but current sharing infrastructure is broken. Researchers store EEG recordings on centralized servers with no encryption, no access control, and no monetization path. Platforms like PhysioNet provide open access but offer zero privacy guarantees and no way to verify who is consuming the data. Most neural data never gets shared at all.

## Our Solution

NeuroVault fixes this with a fully decentralized pipeline:

**1.** EEG data is parsed in-browser and encrypted client-side using Lit Protocol access conditions

**2.** Encrypted data is stored immutably on Filecoin via Storacha, no server ever sees plaintext

**3.** Smart contracts on Flow handle dataset registration, 30-day access licenses, and automatic contributor payments

**4.** NEAR Protocol powers an AI-driven dataset matching engine for natural language discovery

**5.** World ID prevents Sybil attacks by requiring proof-of-personhood

**6.** Every component has a demo fallback, so the platform runs fully functional without any blockchain keys

---

## Architecture

```
                                    NeuroVault
 ___________________________________________________________________________________________
|                                                                                           |
|   Browser (Next.js 14)                                                                    |
|   +-----------+  +------------+  +-----------+  +-----------+  +-----------+              |
|   | EDF+ Parse|  |Lit Protocol|  |  Storacha |  | Flow EVM  |  | World ID  |              |
|   | (eeg-utils)|  | Encryption |  | Upload SDK|  |  ethers   |  |  IDKit    |              |
|   +-----+-----+  +-----+------+  +-----+-----+  +-----+-----+  +-----+-----+            |
|_________|_______________|______________|______________|______________|_____________________|
          |               |              |              |              |
          v               v              v              v              v
    +-----------+  +------------+  +-----------+  +-----------+  +-----------+
    | EEG Data  |  | Lit datil- |  |  Filecoin |  | Flow EVM  |  | World Dev |
    | Features  |  | dev Network|  |  Network  |  | Testnet   |  | Portal    |
    +-----------+  +------------+  +-----------+  +-----+-----+  +-----------+
                                                        |
                   +------------+  +------------+       |
                   |  NEAR AI   |  | Impulse AI |       |
                   |  Matching  |<-| Classifier |  NeuroVaultRegistry.sol
                   |  (testnet) |  | (fallback) |  - registerDataset()
                   +------------+  +------------+  - purchaseAccess()
                                                   - checkAccess()
                                                   - auto-pay contributors
```

---

## Sponsor Integrations

### Storacha / Filecoin - Decentralized Storage

NeuroVault uses Storacha as the primary storage layer for all encrypted EEG data and metadata. When a researcher uploads a dataset, the encrypted blob and its metadata JSON are stored separately on Filecoin via Storacha's UCAN-authenticated client SDK. Each upload returns content-addressed CIDs that serve as permanent, tamper-proof references. The platform maintains a dataset registry (also stored on Storacha) that maps CIDs to on-chain records. Filecoin deal status is queried to display storage proofs in the UI.

**Key files:** `apps/web/lib/storacha.server.ts`, `apps/web/app/api/storage/`

### Lit Protocol - Programmable Encryption

All EEG data is encrypted client-side before upload using Lit Protocol's threshold encryption network. Contributors define EVM-based access conditions when uploading: wallet address checks, NFT ownership gates, ERC-20 token balance requirements, timelock conditions, or on-chain Flow access verification. These conditions are evaluated by Lit's decentralized node network, so no single party can decrypt data. The platform supports composing multiple conditions with AND/OR operators, and includes a World ID condition for proof-of-personhood requirements.

**Key files:** `apps/web/lib/lit.ts`, `apps/web/components/upload/AccessConditionBuilder.tsx`

### Flow - On-Chain Registry, Licensing & Payments

The `NeuroVaultRegistry` Solidity contract (deployed to Flow EVM Testnet, Chain 545) is the economic backbone. It handles dataset registration (mapping CIDs to contributor addresses and prices), 30-day access license issuance, and automatic contributor payments using `ReentrancyGuard` for security. When a researcher purchases access, the FLOW payment goes directly to the contributor with overpayment refunded.

**Key files:** `contracts/flow/solidity/contracts/NeuroVaultRegistry.sol`, `apps/web/lib/flow.ts`

### NEAR Protocol - AI-Powered Dataset Matching

NEAR hosts the `DatasetMatcher` contract (deployed to `neurovault-matcher.testnet`) which provides transparent, on-chain AI dataset discovery. Researchers submit natural language queries with optional filters (channel count, duration, task type). An off-chain matching engine scores all available datasets across four dimensions, then stores results on-chain for auditability:

| Dimension | Weight | What it measures |
|-----------|--------|-----------------|
| Channel Compatibility | 25% | How well the dataset's channel count matches the query |
| Duration Match | 20% | How well the recording duration fits the requested range |
| Task Relevance | 30% | Exact, partial, or no match against task type |
| Text Similarity | 25% | Keyword overlap between query and dataset description |

**Key files:** `contracts/near/src/contract.ts`, `apps/web/lib/near.ts`, `apps/web/app/api/match/`

### World ID - Proof of Personhood

World ID integration prevents Sybil attacks. Users verify their unique humanity via the IDKitWidget (zero-knowledge proofs), and the proof is validated server-side against the World Developer Portal API. Verified status shows as a badge in the navbar and can be required as an access condition for datasets.

**Key files:** `apps/web/lib/worldid.ts`, `apps/web/app/api/verify-world-id/route.ts`, `apps/web/components/WorldIDButton.tsx`

### Impulse AI - Motor Imagery Classification

An AI-powered EEG classifier detects motor imagery patterns (left-hand, right-hand, or resting state) from uploaded brain recordings. It integrates with the Impulse AI API for inference, with a sophisticated built-in fallback: an Event-Related Desynchronization (ERD) classifier that analyzes mu (8-13 Hz) and beta (13-30 Hz) band power across motor cortex channels using a custom Cooley-Tukey FFT implementation.

**Key files:** `apps/web/lib/impulse.ts`, `apps/web/components/explore/MLClassifier.tsx`

---

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
# (Optional) Fill in your keys, the app runs in demo mode without them

# Build the EEG utilities package
pnpm --filter @neurovault/eeg-utils build

# Start development server
pnpm dev
```

The app runs at `http://localhost:3000`. All integrations have demo fallbacks, so you can explore the full UI without configuring any blockchain keys.

### Smart Contracts

```bash
# Flow (Solidity) - compile and test
cd contracts/flow/solidity
npm install
npx hardhat compile
npx hardhat test

# Deploy to Flow EVM Testnet
npx hardhat run scripts/deploy.ts --network flowTestnet

# NEAR - build
cd contracts/near
npm install
npm run build
```

---

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
| Notifications | Sonner | Toast notifications |
| Monorepo | Turborepo + pnpm workspaces | Build orchestration |

---

## Project Structure

```
NeuroVault/
├── apps/web/                    # Next.js 14 frontend (App Router)
│   ├── app/                     # Pages: dashboard, upload, explore, profile
│   ├── components/              # React components (layout, EEG, upload, explore)
│   ├── hooks/                   # Custom hooks (useFlow, useLitProtocol, useNEAR, useWorldID)
│   ├── lib/                     # Integration modules (flow, lit, storacha, near, impulse)
│   └── types/                   # TypeScript type definitions
├── contracts/
│   ├── flow/solidity/           # NeuroVaultRegistry.sol (Hardhat + OpenZeppelin v5)
│   └── near/                    # DatasetMatcher contract (near-sdk-js)
├── packages/eeg-utils/          # EDF+ parser, FFT, feature extraction
└── docs/                        # Architecture documentation
```

---

## Dual-Mode Architecture

Every integration supports a demo fallback for development and judging:

| Component | Real Mode | Demo Mode |
|-----------|-----------|-----------|
| Storacha | Filecoin network upload | Mock CIDs returned |
| Lit Protocol | datil-dev threshold encryption | Web Crypto AES-GCM |
| Flow | ethers v6 + Flow EVM RPC | In-memory dataset array |
| NEAR | near-api-js contract calls | Local Map storage |
| Impulse AI | API endpoint inference | Built-in ERD classifier |
| World ID | IDKitWidget + server validation | Auto-verify bypass |

Demo mode activates automatically when environment variables are missing or blockchain connections fail.

---

## Team

- **Manish Barnwal** - [@imanishbarnwal](https://github.com/imanishbarnwal)

## License

MIT

---

<div align="center">

**Built for [PL Genesis: Frontiers of Collaboration](https://plgenesis.com)**

Track: Fresh Code | Neurotech

</div>
