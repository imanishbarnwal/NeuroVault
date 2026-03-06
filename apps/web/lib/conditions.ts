/**
 * Human-readable descriptions for Lit Protocol access conditions.
 *
 * Used by the upload page (condition summary), EncryptionStatus component,
 * and explore page to display what access conditions are required.
 */

import type { AccessConditionItem, EvmCondition } from "@/types";

/**
 * Truncate an Ethereum address for display: "0x1234...5678"
 */
function truncateAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/**
 * Describe a single EVM condition in human-readable text.
 */
function describeEvmCondition(cond: EvmCondition): string {
  // Wallet condition: no contract, no standardContractType, checks :userAddress
  if (
    !cond.contractAddress &&
    !cond.standardContractType &&
    cond.parameters.includes(":userAddress")
  ) {
    return `Wallet ${truncateAddress(cond.returnValueTest.value)}`;
  }

  // NFT (ERC-721) condition
  if (cond.standardContractType === "ERC721") {
    return `NFT holder (${truncateAddress(cond.contractAddress)})`;
  }

  // Token (ERC-20) condition
  if (cond.standardContractType === "ERC20") {
    return `Token balance >= ${cond.returnValueTest.value} (${truncateAddress(cond.contractAddress)})`;
  }

  // Timelock condition
  if (cond.standardContractType === "timestamp") {
    const ts = parseInt(cond.returnValueTest.value, 10);
    const date = new Date(ts * 1000);
    return `After ${date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
  }

  // Fallback
  return `Custom condition on ${cond.chain}`;
}

/**
 * Convert an array of access conditions into human-readable description strings.
 *
 * @param conditions - The access condition array (conditions + operators)
 * @param accessType - Optional access type for additional context
 * @returns Array of human-readable description strings
 */
export function describeConditions(
  conditions: AccessConditionItem[],
  accessType?: string
): string[] {
  if (!conditions || conditions.length === 0) {
    if (accessType === "public") return ["Open access - no restrictions"];
    if (accessType === "private") return ["Owner only"];
    return ["No conditions specified"];
  }

  const descriptions: string[] = [];

  for (const item of conditions) {
    if ("operator" in item) {
      descriptions.push(item.operator.toUpperCase());
    } else {
      descriptions.push(describeEvmCondition(item));
    }
  }

  return descriptions;
}
