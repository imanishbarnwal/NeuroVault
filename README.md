# NeuroVault

A privacy-preserving neural data commons for brain-computer interface (BCI) research — powered by decentralized storage, access control, and blockchain incentives.

## Setup

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) >= 9

### Install

```bash
# Clone the repo
git clone https://github.com/your-org/neurovault.git
cd neurovault

# Install dependencies
pnpm install

# Copy environment variables
cp .env.example apps/web/.env.local

# Start development server
pnpm dev
```

## Project Structure

```
neurovault/
├── apps/web/          # Next.js 14 frontend (App Router)
├── contracts/flow/    # Flow smart contracts (Cadence + Solidity)
├── packages/eeg-utils # Shared EEG data processing utilities
```

## Tech Stack

- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Storage:** Storacha (Filecoin/IPFS)
- **Access Control:** Lit Protocol
- **Blockchain:** Flow, NEAR Protocol
- **Monorepo:** Turborepo + pnpm workspaces

## License

MIT
