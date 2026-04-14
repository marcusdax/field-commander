// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/**
 * @title CitizenLedgerDTA
 * @notice Direct Tokenized Attribution for NVIN / Field Commander agent compensation.
 * @dev Deployed on Polygon. Agents earn ETH + TCR for verified vehicle recoveries.
 *
 * Roles:
 *   DEFAULT_ADMIN_ROLE — contract owner (multisig in production)
 *   AGENT_ROLE          — authorised field agents
 *   VERIFIER_ROLE       — NVIN backend verifier service
 */
contract CitizenLedgerDTA is ERC20, AccessControl, ReentrancyGuard, Pausable {

    // ─── Roles ─────────────────────────────────────────────────────────────────
    bytes32 public constant AGENT_ROLE    = keccak256("AGENT_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");

    // ─── State ────────────────────────────────────────────────────────────────
    struct Recovery {
        bytes32 plateHash;       // SHA-256 of plate text (never raw)
        address agent;
        uint256 timestamp;
        bytes32 evidenceHash;    // SHA-256 of MagicMoment bundle
        uint256 payoutAmount;
        bool    paid;
        uint8   confidence;      // 0–100
    }

    mapping(bytes32 => Recovery) public recoveries;
    mapping(address => uint256)  public agentEarnings;
    mapping(address => uint256)  public agentRecoveryCount;
    mapping(bytes32 => bool)     public processedPlates;

    uint256 public basePayout    = 0.5 ether;   // $500 equiv
    uint256 public tcrRateBps    = 100;          // 1% in basis points

    // ─── Events ────────────────────────────────────────────────────────────────
    event RecoveryVerified(bytes32 indexed plateHash, address indexed agent, uint256 payout);
    event PayoutExecuted(bytes32 indexed plateHash, address indexed agent, uint256 ethAmount, uint256 tcrAmount);
    event BasePayoutUpdated(uint256 oldPayout, uint256 newPayout);
    event AgentRegistered(address indexed agent);

    // ─── Constructor ─────────────────────────────────────────────────────────────
    constructor() ERC20("Truth Credit", "TCR") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _mint(msg.sender, 1_000_000 * 10 ** decimals());
    }

    // ─── External functions ─────────────────────────────────────────────────────────

    /**
     * @notice Register a new field agent.
     * @param agent Wallet address of the agent.
     */
    function registerAgent(address agent)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        _grantRole(AGENT_ROLE, agent);
        emit AgentRegistered(agent);
    }

    /**
     * @notice Verify a vehicle recovery and execute DTA payout.
     * @param plateHash    SHA-256 of the license plate string.
     * @param agent        Field agent's wallet address.
     * @param evidenceHash SHA-256 of the MagicMoment evidence bundle.
     * @param confidence   AI confidence score (0–100).
     */
    function verifyRecovery(
        bytes32 plateHash,
        address agent,
        bytes32 evidenceHash,
        uint8   confidence
    )
        external
        onlyRole(VERIFIER_ROLE)
        nonReentrant
        whenNotPaused
    {
        require(!processedPlates[plateHash], "DTA: plate already processed");
        require(hasRole(AGENT_ROLE, agent),   "DTA: invalid agent");
        require(confidence >= 85,             "DTA: confidence below threshold");

        uint256 payout = calculatePayout(confidence);
        require(address(this).balance >= payout, "DTA: insufficient contract balance");

        recoveries[plateHash] = Recovery({
            plateHash:     plateHash,
            agent:         agent,
            timestamp:     block.timestamp,
            evidenceHash:  evidenceHash,
            payoutAmount:  payout,
            paid:          false,
            confidence:    confidence
        });
        processedPlates[plateHash] = true;

        emit RecoveryVerified(plateHash, agent, payout);
        _executePayout(plateHash, agent, payout);
    }

    /**
     * @notice Calculate payout based on AI confidence.
     */
    function calculatePayout(uint8 confidence) public view returns (uint256) {
        if (confidence >= 95) return basePayout * 2;          // 2×
        if (confidence >= 90) return basePayout * 15 / 10;    // 1.5×
        return basePayout;                                     // 1×
    }

    /**
     * @notice Update the base payout amount (admin only).
     */
    function setBasePayout(uint256 newPayout)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        emit BasePayoutUpdated(basePayout, newPayout);
        basePayout = newPayout;
    }

    function pause()   external onlyRole(DEFAULT_ADMIN_ROLE) { _pause(); }
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) { _unpause(); }

    receive() external payable {}

    // ─── Internal ─────────────────────────────────────────────────────────────────
    function _executePayout(
        bytes32 plateHash,
        address agent,
        uint256 amount
    ) internal {
        // ETH payout
        (bool success, ) = agent.call{value: amount}("");
        require(success, "DTA: ETH transfer failed");

        // TCR reward: tcrRateBps / 10000 of the payout, converted to tokens
        uint256 tcrReward = (amount * tcrRateBps) / 10_000;
        _mint(agent, tcrReward);

        agentEarnings[agent]       += amount;
        agentRecoveryCount[agent]  += 1;
        recoveries[plateHash].paid  = true;

        emit PayoutExecuted(plateHash, agent, amount, tcrReward);
    }
}
