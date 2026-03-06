import "EVM"

/// Reads the nextDatasetId from the NeuroVaultRegistry Solidity contract
/// deployed on Flow EVM, demonstrating Cadence's cross-VM composability.
///
/// This script shows that Cadence can natively read state from EVM contracts
/// on Flow without any bridges or relayers.
///
/// @param registryAddress: The hex address of the deployed NeuroVaultRegistry
/// @return The current nextDatasetId as UInt256
///
access(all) fun main(registryAddress: String): UInt256 {
    // Parse the EVM contract address
    let address = EVM.addressFromString(registryAddress)

    // ABI-encode the call to nextDatasetId()
    // Function selector: bytes4(keccak256("nextDatasetId()")) = 0xc086f6b4
    let calldata: [UInt8] = [0xc0, 0x86, 0xf6, 0xb4]

    // Execute a read-only call to the EVM contract
    let result = EVM.run(
        tx: nil,
        coinbase: address,
        calldata: calldata,
        gasLimit: 100000,
        value: EVM.Balance(attoflow: 0)
    )

    // Decode the ABI-encoded uint256 result (32 bytes, big-endian)
    let data = result.data
    var value: UInt256 = 0
    var i = 0
    while i < 32 {
        value = value << 8
        value = value + UInt256(data[i])
        i = i + 1
    }

    return value
}
