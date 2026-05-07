// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract EvidenceLedger {
    event EvidenceAnchored(
        bytes32 indexed plateHash,
        bytes32 evidenceHash,
        uint256 timestamp,
        address indexed agent
    );

    function anchor(bytes32 plateHash, bytes32 evidenceHash, address agent) external {
        emit EvidenceAnchored(plateHash, evidenceHash, block.timestamp, agent);
    }
}
