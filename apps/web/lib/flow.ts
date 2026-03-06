/**
 * Flow EVM blockchain integration for NeuroVault.
 *
 * Provides on-chain dataset registry, access licensing, and contributor
 * payments via the NeuroVaultRegistry Solidity contract on Flow EVM.
 *
 * Dual-mode:
 *   - Real mode: Reads/writes to the deployed contract via ethers v6
 *   - Demo mode: In-memory fallback when contract is unavailable
 */

import type {
  FlowDataset,
  FlowLicense,
  FlowContributorStats,
  FlowWalletState,
} from "@/types";

// ── Constants ─────────────────────────────────────────────────────

const FLOW_EVM_RPC = "https://testnet.evm.nodes.onflow.org";
const FLOW_EVM_CHAIN_ID = 545;
const REGISTRY_ADDRESS =
  process.env.NEXT_PUBLIC_FLOW_REGISTRY_ADDRESS || "";

/** Human-readable ABI for ethers v6 — no JSON file or build dependency */
const REGISTRY_ABI = [
  "function nextDatasetId() view returns (uint256)",
  "function registerDataset(string dataCID, string metadataCID, uint256 price) returns (uint256)",
  "function purchaseAccess(uint256 datasetId) payable",
  "function checkAccess(address user, uint256 datasetId) view returns (bool)",
  "function getDataset(uint256 datasetId) view returns (tuple(uint256 id, address contributor, string dataCID, string metadataCID, uint256 price, uint256 registeredAt, bool active))",
  "function listDatasets() view returns (tuple(uint256 id, address contributor, string dataCID, string metadataCID, uint256 price, uint256 registeredAt, bool active)[])",
  "function getContributorEarnings(address contributor) view returns (uint256)",
  "function getContributorDatasets(address contributor) view returns (uint256[])",
  "function LICENSE_DURATION() view returns (uint256)",
  "event DatasetRegistered(uint256 indexed id, address indexed contributor, string dataCID, string metadataCID, uint256 price)",
  "event AccessGranted(uint256 indexed datasetId, address indexed licensee, uint256 expiresAt)",
  "event PaymentDistributed(uint256 indexed datasetId, address indexed contributor, uint256 amount)",
];

// ── Singleton State ───────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _provider: any = null;
let _isDemo = false;
let _initPromise: Promise<void> | null = null;

// ── Demo Mode In-Memory State ─────────────────────────────────────

let _demoNextId = 0;
const _demoDatasets: FlowDataset[] = [];
const _demoAccess: Map<string, Set<number>> = new Map();
const _demoEarnings: Map<string, bigint> = new Map();

function _demoKey(addr: string): string {
  return addr.toLowerCase();
}

// ── Initialization ────────────────────────────────────────────────

/**
 * Initialize the Flow EVM provider and determine operating mode.
 * Falls back to demo mode if the registry address is unset or the
 * contract is unreachable.
 */
export async function initFlow(): Promise<{ isDemo: boolean }> {
  if (_initPromise) {
    await _initPromise;
    return { isDemo: _isDemo };
  }

  _initPromise = (async () => {
    if (!REGISTRY_ADDRESS) {
      console.warn(
        "NEXT_PUBLIC_FLOW_REGISTRY_ADDRESS not set — using demo mode"
      );
      _isDemo = true;
      return;
    }

    try {
      const { JsonRpcProvider, Contract } = await import("ethers");
      const provider = new JsonRpcProvider(FLOW_EVM_RPC);

      // Smoke-test: try to read nextDatasetId
      const contract = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, provider);
      await contract.nextDatasetId();

      _provider = provider;
      _isDemo = false;
    } catch (err) {
      console.warn(
        "Flow EVM contract unreachable — using demo mode:",
        err instanceof Error ? err.message : err
      );
      _isDemo = true;
    }
  })();

  await _initPromise;
  return { isDemo: _isDemo };
}

/** Check if currently in demo mode */
export function isFlowDemo(): boolean {
  return _isDemo;
}

// ── Wallet Connection ─────────────────────────────────────────────

/**
 * Connect to MetaMask (or compatible wallet) and switch to Flow EVM Testnet.
 * Returns the wallet state on success.
 */
export async function connectWallet(): Promise<FlowWalletState> {
  if (typeof window === "undefined" || !(window as any).ethereum) { // eslint-disable-line @typescript-eslint/no-explicit-any
    throw new Error("No Ethereum wallet found. Please install MetaMask.");
  }

  const { BrowserProvider } = await import("ethers");
  const ethereum = (window as any).ethereum; // eslint-disable-line @typescript-eslint/no-explicit-any
  const browserProvider = new BrowserProvider(ethereum);

  // Request account access
  await browserProvider.send("eth_requestAccounts", []);
  const signer = await browserProvider.getSigner();
  const address = await signer.getAddress();

  // Ensure correct chain
  const network = await browserProvider.getNetwork();
  const chainId = Number(network.chainId);

  if (chainId !== FLOW_EVM_CHAIN_ID) {
    try {
      await ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${FLOW_EVM_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
      // Chain not added yet — add it
      if (switchError?.code === 4902) {
        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: `0x${FLOW_EVM_CHAIN_ID.toString(16)}`,
              chainName: "Flow EVM Testnet",
              nativeCurrency: { name: "FLOW", symbol: "FLOW", decimals: 18 },
              rpcUrls: [FLOW_EVM_RPC],
              blockExplorerUrls: ["https://evm-testnet.flowscan.io"],
            },
          ],
        });
      } else {
        throw switchError;
      }
    }
  }

  return {
    address,
    isConnected: true,
    chainId: FLOW_EVM_CHAIN_ID,
  };
}

/**
 * Disconnect wallet (clear local state only — MetaMask manages connections).
 */
export function disconnectWallet(): FlowWalletState {
  return { address: null, isConnected: false, chainId: null };
}

// ── Contract Interactions ─────────────────────────────────────────

/**
 * Register a dataset on-chain.
 * @returns The on-chain dataset ID
 */
export async function registerDatasetOnChain(
  dataCID: string,
  metadataCID: string,
  priceInFlow: string
): Promise<number> {
  if (_isDemo) {
    return _demoRegisterDataset(dataCID, metadataCID, priceInFlow);
  }

  const { BrowserProvider, Contract, parseEther } = await import("ethers");
  const ethereum = (window as any).ethereum; // eslint-disable-line @typescript-eslint/no-explicit-any
  const browserProvider = new BrowserProvider(ethereum);
  const signer = await browserProvider.getSigner();
  const contract = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);

  const price = parseEther(priceInFlow);
  const tx = await contract.registerDataset(dataCID, metadataCID, price);
  const receipt = await tx.wait();

  // Parse DatasetRegistered event for the ID
  const event = receipt.logs
    .map((log: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      try {
        return contract.interface.parseLog(log);
      } catch {
        return null;
      }
    })
    .find((e: any) => e?.name === "DatasetRegistered"); // eslint-disable-line @typescript-eslint/no-explicit-any

  if (!event) throw new Error("DatasetRegistered event not found in receipt");

  return Number(event.args.id);
}

/**
 * Purchase access to a dataset.
 */
export async function purchaseAccess(datasetId: number): Promise<void> {
  if (_isDemo) {
    _demoPurchaseAccess(datasetId);
    return;
  }

  const { BrowserProvider, Contract } = await import("ethers");
  const ethereum = (window as any).ethereum; // eslint-disable-line @typescript-eslint/no-explicit-any
  const browserProvider = new BrowserProvider(ethereum);
  const signer = await browserProvider.getSigner();

  // Read price from contract
  const readContract = new Contract(
    REGISTRY_ADDRESS,
    REGISTRY_ABI,
    _provider
  );
  const dataset = await readContract.getDataset(datasetId);
  const price = dataset.price;

  // Send payment
  const writeContract = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, signer);
  const tx = await writeContract.purchaseAccess(datasetId, { value: price });
  await tx.wait();
}

/**
 * Check if a user has access to a dataset (read-only).
 */
export async function checkAccess(
  datasetId: number,
  userAddress?: string
): Promise<boolean> {
  if (_isDemo) {
    return _demoCheckAccess(datasetId, userAddress);
  }

  const { Contract } = await import("ethers");
  const contract = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, _provider);

  // If no address provided, try to get from connected wallet
  let address = userAddress;
  if (!address && typeof window !== "undefined" && (window as any).ethereum) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { BrowserProvider } = await import("ethers");
    const browserProvider = new BrowserProvider((window as any).ethereum); // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const signer = await browserProvider.getSigner();
      address = await signer.getAddress();
    } catch {
      return false;
    }
  }

  if (!address) return false;

  return contract.checkAccess(address, datasetId);
}

/**
 * Get contributor statistics (earnings + dataset IDs).
 */
export async function getContributorStats(
  address?: string
): Promise<FlowContributorStats> {
  if (_isDemo) {
    return _demoGetStats(address);
  }

  const { Contract } = await import("ethers");
  const contract = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, _provider);

  // If no address provided, try to get from connected wallet
  let addr = address;
  if (!addr && typeof window !== "undefined" && (window as any).ethereum) { // eslint-disable-line @typescript-eslint/no-explicit-any
    const { BrowserProvider } = await import("ethers");
    const browserProvider = new BrowserProvider((window as any).ethereum); // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      const signer = await browserProvider.getSigner();
      addr = await signer.getAddress();
    } catch {
      return { totalEarnings: BigInt(0), datasetIds: [], datasetCount: 0 };
    }
  }

  if (!addr) {
    return { totalEarnings: BigInt(0), datasetIds: [], datasetCount: 0 };
  }

  // Parallel fetch
  const [earnings, ids] = await Promise.all([
    contract.getContributorEarnings(addr),
    contract.getContributorDatasets(addr),
  ]);

  const datasetIds = ids.map((id: any) => Number(id)); // eslint-disable-line @typescript-eslint/no-explicit-any

  return {
    totalEarnings: BigInt(earnings),
    datasetIds,
    datasetCount: datasetIds.length,
  };
}

/**
 * List all on-chain datasets (read-only).
 */
export async function listOnChainDatasets(): Promise<FlowDataset[]> {
  if (_isDemo) {
    return [..._demoDatasets];
  }

  const { Contract } = await import("ethers");
  const contract = new Contract(REGISTRY_ADDRESS, REGISTRY_ABI, _provider);
  const raw = await contract.listDatasets();

  return raw.map((ds: any) => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: Number(ds.id),
    contributor: ds.contributor,
    dataCID: ds.dataCID,
    metadataCID: ds.metadataCID,
    price: BigInt(ds.price),
    registeredAt: Number(ds.registeredAt),
    active: ds.active,
  }));
}

// ── Demo Mode Implementations ─────────────────────────────────────

function _demoRegisterDataset(
  dataCID: string,
  metadataCID: string,
  priceInFlow: string
): number {
  const id = _demoNextId++;
  const contributor =
    typeof window !== "undefined" && (window as any).ethereum // eslint-disable-line @typescript-eslint/no-explicit-any
      ? "0xDemoContributor"
      : "0xDemoContributor";

  _demoDatasets.push({
    id,
    contributor,
    dataCID,
    metadataCID,
    price: BigInt(Math.floor(parseFloat(priceInFlow) * 1e18)),
    registeredAt: Math.floor(Date.now() / 1000),
    active: true,
  });

  // Track contributor datasets
  const key = _demoKey(contributor);
  if (!_demoEarnings.has(key)) _demoEarnings.set(key, BigInt(0));

  return id;
}

function _demoPurchaseAccess(datasetId: number): void {
  const ds = _demoDatasets.find((d) => d.id === datasetId);
  if (!ds) throw new Error("Dataset not found");

  const buyer = "0xDemoBuyer";
  const buyerKey = _demoKey(buyer);

  if (!_demoAccess.has(buyerKey)) _demoAccess.set(buyerKey, new Set());
  _demoAccess.get(buyerKey)!.add(datasetId);

  // Track earnings
  const contribKey = _demoKey(ds.contributor);
  const current = _demoEarnings.get(contribKey) || BigInt(0);
  _demoEarnings.set(contribKey, current + ds.price);
}

function _demoCheckAccess(
  datasetId: number,
  userAddress?: string
): boolean {
  const ds = _demoDatasets.find((d) => d.id === datasetId);
  if (!ds || !ds.active) return false;

  // Free datasets
  if (ds.price === BigInt(0)) return true;

  // Contributor self-access
  const addr = userAddress || "0xDemoBuyer";
  if (_demoKey(ds.contributor) === _demoKey(addr)) return true;

  // Check purchased access
  const accessSet = _demoAccess.get(_demoKey(addr));
  return accessSet?.has(datasetId) ?? false;
}

function _demoGetStats(address?: string): FlowContributorStats {
  const addr = address || "0xDemoContributor";
  const key = _demoKey(addr);
  const totalEarnings = _demoEarnings.get(key) || BigInt(0);
  const datasetIds = _demoDatasets
    .filter((d) => _demoKey(d.contributor) === key)
    .map((d) => d.id);

  return {
    totalEarnings,
    datasetIds,
    datasetCount: datasetIds.length,
  };
}
