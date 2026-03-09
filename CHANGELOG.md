# Changelog

All notable changes to the NeuroVault project, built during the PL Genesis: Frontiers of Collaboration hackathon.

> **Fresh Code Track** - All code was written during the hackathon event period.

---

## [0.1.0] - 2026-03-09

### Core Platform

- **Landing Page** - Animated EEG waveform canvas background, 6-section layout with scroll reveal animations, sponsor grid with links, hero CTAs, hackathon badge
- **Dashboard** - Stats row (datasets, earnings, licenses, impact score), activity feed, recharts earnings chart, datasets table with mobile card view, loading skeletons
- **Profile** - Tabbed interface (Contributor / Researcher), wallet header with World ID badge, earnings breakdown with progress bars, active licenses table, impact certificates
- **Explore** - Dataset browsing, EEG waveform visualization, ML classification, access purchasing with toast notifications
- **Upload** - 5-step wizard: EDF parsing, metadata preview, access condition builder, encryption and upload, on-chain registration

### Navigation & UX

- **Responsive Navbar** - Mobile hamburger menu, active page indicators, World ID badge, notification bell, wallet connection
- **Toast Notifications** - Success/error toasts for uploads, registrations, and purchases (sonner)
- **Loading Skeletons** - Shimmer effect skeletons for stats, tables, charts, and cards
- **Error Boundaries** - Graceful error handling with retry UI
- **Empty States** - Contextual messages for all empty lists with action buttons
- **Page Transitions** - CSS fade-in animations on navigation

### Storacha / Filecoin Integration

- Server-side Storacha client with Ed25519 agent authentication and UCAN delegation proofs
- Encrypted EEG data upload with separate metadata JSON storage
- Content-addressed CID generation for tamper-proof references
- Dataset registry persistence on Storacha (JSON-based)
- Filecoin deal status querying and storage proof display
- Gateway URL generation for data retrieval (w3s.link)

### Lit Protocol Integration

- Client-side threshold encryption using datil-dev network
- 5 access condition types: wallet address, NFT gate (ERC-721), token gate (ERC-20), timelock, World ID
- Access condition builder UI with chain selection (Ethereum, Polygon, Arbitrum, Optimism, Base)
- AND/OR composite condition support
- On-chain Flow access verification condition
- Demo fallback: Web Crypto AES-GCM encryption when Lit unavailable

### Flow Blockchain Integration

- **NeuroVaultRegistry.sol** - Solidity contract (OpenZeppelin v5) deployed to Flow EVM Testnet (Chain 545)
  - Dataset registration with CID mapping and contributor tracking
  - 30-day access license issuance with automatic payment distribution
  - ReentrancyGuard protection on payment functions
  - View functions: getDataset, listDatasets, checkAccess, getContributorEarnings
- **Cross-VM Cadence Script** - Reads Solidity contract state natively from Cadence using EVM.run()
- **Frontend Integration** - ethers v6 provider, MetaMask wallet connection with auto chain switching
- **Hardhat Test Suite** - Comprehensive tests for registration, licensing, payments, and access control

### NEAR Protocol Integration

- **DatasetMatcher Contract** - near-sdk-js contract deployed to neurovault-matcher.testnet
  - Natural language query submission with structured filters
  - 4-dimension scoring: channel compatibility (25%), duration (20%), task relevance (30%), text similarity (25%)
  - On-chain result storage for audit transparency
  - Recent query browsing (capped at 50)
- **AI Matching API** - /api/match endpoint connecting frontend to NEAR contract
- **Frontend Hook** - useNEAR with query submission, result retrieval, and demo fallback

### World ID Integration

- Zero-knowledge proof verification via @worldcoin/idkit v2
- Server-side proof validation against World Developer Portal API
- localStorage-based verification persistence
- WorldIDButton component with verified/demo/unverified states
- Integration into upload flow (pre-upload gate) and explore flow (pre-purchase gate)
- World ID as Lit Protocol access condition type

### Impulse AI / ML Classification

- Motor imagery classification from EEG signals (left-hand, right-hand, rest)
- Impulse AI API integration for hosted inference
- Built-in Event-Related Desynchronization (ERD) classifier fallback:
  - Mu (8-13 Hz) and beta (13-30 Hz) band power analysis
  - Motor cortex channel mapping (C3, C4, FC3, FC4, CP3, CP4)
  - Laterality index: (R - L) / (|R| + |L|)
  - Custom Cooley-Tukey FFT implementation
  - Spatial fallback for non-standard electrode layouts

### EEG Utilities Package (@neurovault/eeg-utils)

- EDF+ file parser with variable sampling rate support
- Band power extraction: Delta, Theta, Alpha, Beta, Gamma
- Channel statistics: mean, variance, kurtosis
- FFT-based power spectrum computation
- Standardized metadata generation
- Vitest test suite

### EEG Visualization Components

- Canvas-based real-time waveform viewer with play/pause and scrubbing
- Multi-channel display with min-max downsampling for large datasets
- Band power bar chart (Recharts) with frequency range tooltips
- Feature heatmap for cross-channel statistics
- Mock EEG data generator (24 channels, 10-20 system, realistic rhythms)

---

## Development Timeline

| Date | Milestone |
|------|-----------|
| Day 1 | Project scaffold, monorepo setup, EEG parser, Storacha integration |
| Day 2 | Lit Protocol encryption, access condition builder, upload wizard |
| Day 3 | Flow smart contract (Solidity), deployment, frontend integration |
| Day 4 | NEAR AI matching contract, dataset discovery, explore page |
| Day 5 | Impulse AI classifier, EEG visualization components |
| Day 6 | World ID integration, proof of personhood gates |
| Day 7 | Landing page, dashboard polish, profile tabs, documentation |
