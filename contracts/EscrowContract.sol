// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title EscrowContract
 * @notice Group Buy escrow for Dora-AI.
 *
 * Participants contribute equal shares. Once fully funded, funds are
 * released to the merchant. If not funded by expiry, anyone can trigger
 * refunds to all contributors.
 *
 * Designed for Hedera Smart Contract Service (HSCS).
 */
contract EscrowContract {
    // --- State ---
    address public creator;
    address public merchant;
    uint256 public totalAmount;
    uint256 public perPersonAmount;
    uint256 public participantCount;
    uint256 public currentContributions;
    uint256 public contributorCount;
    uint256 public expiresAt;

    bool public fullyFunded;
    bool public executed;
    bool public refunded;

    mapping(address => uint256) public contributions;
    address[] public contributorAddresses;

    // --- Events ---
    event ContributionReceived(address indexed contributor, uint256 amount);
    event FundsReleased(address indexed merchant, uint256 amount);
    event RefundIssued(address indexed participant, uint256 amount);
    event GroupBuyCancelled();

    // --- Modifiers ---
    modifier onlyCreator() {
        require(msg.sender == creator, "Not creator");
        _;
    }
    modifier onlyBeforeExpiry() {
        require(block.timestamp < expiresAt, "Expired");
        _;
    }
    modifier onlyAfterExpiry() {
        require(block.timestamp >= expiresAt, "Not expired");
        _;
    }
    modifier notExecuted() {
        require(!executed, "Already executed");
        _;
    }
    modifier notRefunded() {
        require(!refunded, "Already refunded");
        _;
    }
    modifier exactlyPerPerson() {
        require(msg.value == perPersonAmount, "Wrong amount");
        _;
    }

    // --- Constructor ---
    constructor(
        address _merchant,
        uint256 _totalAmount,
        uint256 _participantCount,
        uint256 _durationDays
    ) {
        require(_participantCount >= 2, "Need at least 2 participants");
        require(_totalAmount > 0, "Amount must be > 0");

        creator = msg.sender;
        merchant = _merchant;
        totalAmount = _totalAmount;
        participantCount = _participantCount;
        perPersonAmount = _totalAmount / _participantCount;
        expiresAt = block.timestamp + (_durationDays * 1 days);
    }

    // --- Core Functions ---

    /**
     * @notice Contribute exactly perPersonAmount to participate.
     */
    function contribute() external payable
        onlyBeforeExpiry
        notExecuted
        notRefunded
        exactlyPerPerson
    {
        require(contributions[msg.sender] == 0, "Already contributed");
        require(contributorCount < participantCount, "Full");

        contributions[msg.sender] = msg.value;
        contributorAddresses.push(msg.sender);
        currentContributions += msg.value;
        contributorCount++;

        emit ContributionReceived(msg.sender, msg.value);

        if (currentContributions >= totalAmount && contributorCount == participantCount) {
            fullyFunded = true;
            _execute();
        }
    }

    /**
     * @notice Creator can manually trigger execution once fully funded.
     */
    function execute() external onlyCreator notExecuted notRefunded {
        require(fullyFunded, "Not fully funded");
        _execute();
    }

    function _execute() private {
        require(!executed, "Already executed");
        executed = true;
        (bool success, ) = payable(merchant).call{value: totalAmount}("");
        require(success, "Transfer failed");
        emit FundsReleased(merchant, totalAmount);
    }

    /**
     * @notice Anyone can trigger refunds after expiry if not executed.
     */
    function refund() external onlyAfterExpiry notExecuted notRefunded {
        refunded = true;

        for (uint256 i = 0; i < contributorAddresses.length; i++) {
            address contributor = contributorAddresses[i];
            uint256 amount = contributions[contributor];
            if (amount > 0) {
                contributions[contributor] = 0;
                (bool success, ) = payable(contributor).call{value: amount}("");
                require(success, "Refund transfer failed");
                emit RefundIssued(contributor, amount);
            }
        }

        emit GroupBuyCancelled();
    }

    // --- View Functions ---

    function getStatus()
        external
        view
        returns (
            uint256 _total,
            uint256 _current,
            uint256 _contributors,
            bool _funded,
            bool _executed,
            bool _refunded,
            uint256 _expires
        )
    {
        return (
            totalAmount,
            currentContributions,
            contributorCount,
            fullyFunded,
            executed,
            refunded,
            expiresAt
        );
    }

    // --- Receive (reject plain transfers) ---
    receive() external payable {
        revert("Use contribute() to send funds");
    }
}
