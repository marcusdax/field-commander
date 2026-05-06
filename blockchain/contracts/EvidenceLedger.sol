// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title EvidenceLedger
 * @notice Lightweight evidence anchoring for Field Commander / NVIN.
 * @dev Emits one event per anchor. No state storage — gas ~21,000.
 *      CitizenLedgerDTA handles financial settlement separately.
 */
contract EvidenceLedger {

    event EvidenceAnchored(
        bytes32 indexed plateHash,
        bytes32          evidenceHash,
        uint256          timestamp,
        address indexed  agent
    );

    /**
     * @notice Anchor evidence on-chain. Called by the NVIN backend verifier.
     * @param plateHash    keccak256 of the SHA-256 plate hash (PII-free).
     * @param evidenceHash keccak256 of the MagicMoment bundle.
     * @param agent        Field agent wallet (address(0) for anonymous).
     */
    function anchor(
        bytes32 plateHash,
        bytes32 evidenceHash,
        address agent
    ) external {
        emit EvidenceAnchored(plateHash, evidenceHash, block.timestamp, agent);
    }
}
