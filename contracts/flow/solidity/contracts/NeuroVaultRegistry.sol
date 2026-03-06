// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract NeuroVaultRegistry is Ownable, ReentrancyGuard {
    // ── Structs ──────────────────────────────────────────────────

    struct Dataset {
        uint256 id;
        address contributor;
        string dataCID;
        string metadataCID;
        uint256 price;
        uint256 registeredAt;
        bool active;
    }

    struct License {
        address licensee;
        uint256 datasetId;
        uint256 purchasedAt;
        uint256 expiresAt;
    }

    // ── Constants ────────────────────────────────────────────────

    uint256 public constant LICENSE_DURATION = 30 days;

    // ── State ────────────────────────────────────────────────────

    uint256 public nextDatasetId;
    mapping(uint256 => Dataset) public datasets;
    mapping(address => mapping(uint256 => License)) public licenses;
    mapping(address => uint256) public contributorEarnings;
    mapping(address => uint256[]) private _contributorDatasets;
    uint256[] private _allDatasetIds;

    // ── Events ───────────────────────────────────────────────────

    event DatasetRegistered(
        uint256 indexed id,
        address indexed contributor,
        string dataCID,
        string metadataCID,
        uint256 price
    );

    event AccessGranted(
        uint256 indexed datasetId,
        address indexed licensee,
        uint256 expiresAt
    );

    event PaymentDistributed(
        uint256 indexed datasetId,
        address indexed contributor,
        uint256 amount
    );

    // ── Constructor ──────────────────────────────────────────────

    constructor() Ownable(msg.sender) {}

    // ── Dataset Registration ─────────────────────────────────────

    function registerDataset(
        string calldata dataCID,
        string calldata metadataCID,
        uint256 price
    ) external returns (uint256) {
        require(bytes(dataCID).length > 0, "Data CID cannot be empty");
        require(bytes(metadataCID).length > 0, "Metadata CID cannot be empty");

        uint256 id = nextDatasetId++;
        datasets[id] = Dataset({
            id: id,
            contributor: msg.sender,
            dataCID: dataCID,
            metadataCID: metadataCID,
            price: price,
            registeredAt: block.timestamp,
            active: true
        });

        _contributorDatasets[msg.sender].push(id);
        _allDatasetIds.push(id);

        emit DatasetRegistered(id, msg.sender, dataCID, metadataCID, price);

        return id;
    }

    // ── Access Licensing ─────────────────────────────────────────

    function purchaseAccess(uint256 datasetId) external payable nonReentrant {
        Dataset storage ds = datasets[datasetId];
        require(ds.active, "Dataset does not exist or is inactive");
        require(ds.contributor != msg.sender, "Contributors have automatic access");
        require(
            licenses[msg.sender][datasetId].expiresAt < block.timestamp,
            "Active license already exists"
        );
        require(msg.value >= ds.price, "Insufficient payment");

        uint256 expiresAt = block.timestamp + LICENSE_DURATION;
        licenses[msg.sender][datasetId] = License({
            licensee: msg.sender,
            datasetId: datasetId,
            purchasedAt: block.timestamp,
            expiresAt: expiresAt
        });

        // Pay contributor
        if (ds.price > 0) {
            contributorEarnings[ds.contributor] += ds.price;
            (bool sent, ) = ds.contributor.call{value: ds.price}("");
            require(sent, "Payment to contributor failed");

            emit PaymentDistributed(datasetId, ds.contributor, ds.price);
        }

        // Refund overpayment
        uint256 refund = msg.value - ds.price;
        if (refund > 0) {
            (bool refundSent, ) = msg.sender.call{value: refund}("");
            require(refundSent, "Refund failed");
        }

        emit AccessGranted(datasetId, msg.sender, expiresAt);
    }

    // ── Access Checks ────────────────────────────────────────────

    function checkAccess(
        address user,
        uint256 datasetId
    ) external view returns (bool) {
        Dataset storage ds = datasets[datasetId];
        if (!ds.active) return false;

        // Contributors always have access to their own datasets
        if (ds.contributor == user) return true;

        // Free datasets are accessible to everyone
        if (ds.price == 0) return true;

        // Check if the user has a valid license
        return licenses[user][datasetId].expiresAt >= block.timestamp;
    }

    // ── View Functions ───────────────────────────────────────────

    function getDataset(
        uint256 datasetId
    ) external view returns (Dataset memory) {
        return datasets[datasetId];
    }

    function listDatasets() external view returns (Dataset[] memory) {
        Dataset[] memory result = new Dataset[](_allDatasetIds.length);
        for (uint256 i = 0; i < _allDatasetIds.length; i++) {
            result[i] = datasets[_allDatasetIds[i]];
        }
        return result;
    }

    function getContributorEarnings(
        address contributor
    ) external view returns (uint256) {
        return contributorEarnings[contributor];
    }

    function getContributorDatasets(
        address contributor
    ) external view returns (uint256[] memory) {
        return _contributorDatasets[contributor];
    }
}
