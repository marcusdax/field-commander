// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

contract CitizenLedgerDTA {
    event MagicMomentRegistered(
        bytes32 indexed dtaToken,
        bytes32 immutableHash,
        uint256 tcAwarded,
        address indexed analystZKP,
        uint256 timestamp
    );

    event DTASettled(
        bytes32 indexed dtaToken,
        address indexed recipient,
        uint256 amount,
        uint256 timestamp
    );

    event AnalystVerified(
        address indexed analyst,
        uint256 clearanceLevel,
        uint256 timestamp
    );

    mapping(bytes32 => bool) public verifiedDTAs;
    mapping(address => uint256) public truthCredits;
    mapping(address => uint256) public clearanceLevels;
    mapping(bytes32 => uint256) public dtaTimestamps;

    uint256 public totalTruthCreditsMinted;
    uint256 public totalMissions;
    uint256 public totalVerifiedAnalysts;

    address public governance;
    uint256 public constant VERIFICATION_BASE_TC = 25;
    uint256 public constant MULTIPLIER_DENOMINATOR = 100;

    modifier onlyGovernance() {
        require(msg.sender == governance, "Only governance");
        _;
    }

    modifier onlyVerifiedAnalyst() {
        require(clearanceLevels[msg.sender] >= 1, "Analyst not verified");
        _;
    }

    constructor() {
        governance = msg.sender;
    }

    function registerAnalyst(address analyst, uint256 clearanceLevel) external onlyGovernance {
        require(clearanceLevels[analyst] == 0, "Already registered");
        clearanceLevels[analyst] = clearanceLevel;
        totalVerifiedAnalysts++;
        emit AnalystVerified(analyst, clearanceLevel, block.timestamp);
    }

    function registerMagicMoment(
        bytes32 dtaToken,
        bytes32 immutableHash,
        uint256 tcAwarded,
        bytes calldata zkpProof
    ) external onlyVerifiedAnalyst {
        require(!verifiedDTAs[dtaToken], "DTA already registered");
        
        verifiedDTAs[dtaToken] = true;
        dtaTimestamps[dtaToken] = block.timestamp;
        totalTruthCreditsMinted += tcAwarded;
        truthCredits[msg.sender] += tcAwarded;
        totalMissions++;

        emit MagicMomentRegistered(
            dtaToken,
            immutableHash,
            tcAwarded,
            msg.sender,
            block.timestamp
        );
    }

    function settleDTA(
        bytes32 dtaToken,
        address recipient,
        uint256 multiplier
    ) external onlyGovernance {
        require(verifiedDTAs[dtaToken], "DTA not verified");
        
        uint256 tcAmount = (VERIFICATION_BASE_TC * multiplier) / MULTIPLIER_DENOMINATOR;
        truthCredits[recipient] += tcAmount;
        totalTruthCreditsMinted += tcAmount;

        emit DTASettled(dtaToken, recipient, tcAmount, block.timestamp);
    }

    function verifyDTA(bytes32 dtaToken) external view returns (bool) {
        return verifiedDTAs[dtaToken];
    }

    function getTruthCredits(address account) external view returns (uint256) {
        return truthCredits[account];
    }

    function getAnalystClearance(address analyst) external view returns (uint256) {
        return clearanceLevels[analyst];
    }

    function getStats() external view returns (
        uint256 _totalMissions,
        uint256 _totalTruthCreditsMinted,
        uint256 _verifiedAnalysts,
        uint256 _dtaCount
    ) {
        return (totalMissions, totalTruthCreditsMinted, totalVerifiedAnalysts, totalMissions);
    }

    function updateGovernance(address newGovernance) external onlyGovernance {
        governance = newGovernance;
    }

    function withdrawTC(address payable recipient, uint256 amount) external onlyGovernance {
        require(truthCredits[address(this)] >= amount, "Insufficient balance");
        truthCredits[address(this)] -= amount;
        recipient.transfer(amount);
    }
}
