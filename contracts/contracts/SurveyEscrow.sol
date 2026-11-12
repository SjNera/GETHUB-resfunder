// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title SurveyEscrow
/// @notice Holds a researcher's survey budget in native tBNB. Pays the fixed rate only on the
///         agent's Pay decision, at most once per respondent, and refunds the rest on close.
/// @dev No owner, no admin functions, no pause. Source: docs/TDD.md section 6.
contract SurveyEscrow is ReentrancyGuard {
    enum Decision {
        DontPay,
        Pay
    }

    struct Survey {
        address researcher;
        bytes32 surveyHash;
        uint256 rate; // wei per paid response
        uint256 quota; // max paid responses
        uint256 deadline; // unix seconds
        uint256 balance; // budget left, wei
        uint256 paidCount;
        bool closed;
    }

    address public immutable agent;
    address public immutable platform;
    uint256 public immutable gasPerResponse; // wei
    uint256 public immutable minProfitPerResponse; // wei
    uint256 public nextSurveyId = 1;
    mapping(uint256 => Survey) public surveys;
    mapping(uint256 => mapping(address => bool)) public decided;

    event SurveyCreated(
        uint256 indexed surveyId,
        address indexed researcher,
        bytes32 surveyHash,
        uint256 rate,
        uint256 quota,
        uint256 deadline,
        uint256 feePerResponse
    );
    event Paid(uint256 indexed surveyId, address indexed respondent, bytes32 reasonHash, uint256 amount);
    event Blocked(uint256 indexed surveyId, address indexed respondent, bytes32 reasonHash);
    event Closed(uint256 indexed surveyId, address indexed researcher, uint256 refunded);

    error ZeroAddress();
    error InvalidSurvey();
    error FeeTooLow();
    error WrongDeposit();
    error NotAgent();
    error SurveyNotFound();
    error SurveyNotOpen();
    error AlreadyDecided();
    error QuotaFull();
    error AlreadyClosed();
    error NotAllowed();
    error TransferFailed();

    constructor(address agent_, address platform_, uint256 gasPerResponse_, uint256 minProfitPerResponse_) {
        if (agent_ == address(0) || platform_ == address(0)) revert ZeroAddress();
        agent = agent_;
        platform = platform_;
        gasPerResponse = gasPerResponse_;
        minProfitPerResponse = minProfitPerResponse_;
    }

    /// @notice Locks rate x quota as the budget and pays the fee split to the agent and platform.
    /// @dev msg.value must equal rate * quota + quota * feePerResponse exactly.
    function createSurvey(
        bytes32 surveyHash,
        uint256 rate,
        uint256 quota,
        uint256 deadline,
        uint256 feePerResponse
    ) external payable nonReentrant returns (uint256 surveyId) {
        if (rate == 0 || quota == 0 || deadline <= block.timestamp) revert InvalidSurvey();
        if (feePerResponse < gasPerResponse + minProfitPerResponse) revert FeeTooLow();

        uint256 budget = rate * quota;
        if (msg.value != budget + quota * feePerResponse) revert WrongDeposit();

        surveyId = nextSurveyId++;
        surveys[surveyId] = Survey({
            researcher: msg.sender,
            surveyHash: surveyHash,
            rate: rate,
            quota: quota,
            deadline: deadline,
            balance: budget,
            paidCount: 0,
            closed: false
        });

        _send(agent, quota * gasPerResponse);
        _send(platform, quota * (feePerResponse - gasPerResponse));

        emit SurveyCreated(surveyId, msg.sender, surveyHash, rate, quota, deadline, feePerResponse);
    }

    /// @notice Agent only. Records one decision per respondent per survey; Pay sends the rate.
    function recordDecision(
        uint256 surveyId,
        address respondent,
        Decision decision,
        bytes32 reasonHash
    ) external nonReentrant {
        if (msg.sender != agent) revert NotAgent();
        Survey storage s = surveys[surveyId];
        if (s.researcher == address(0)) revert SurveyNotFound();
        if (s.closed || block.timestamp > s.deadline) revert SurveyNotOpen();
        if (decided[surveyId][respondent]) revert AlreadyDecided();
        if (s.paidCount >= s.quota) revert QuotaFull();

        decided[surveyId][respondent] = true;

        if (decision == Decision.Pay) {
            uint256 amount = s.rate;
            s.paidCount += 1;
            s.balance -= amount;
            _send(respondent, amount);
            emit Paid(surveyId, respondent, reasonHash, amount);
        } else {
            emit Blocked(surveyId, respondent, reasonHash);
        }
    }

    /// @notice The researcher may close any time. The agent may close only when the quota is full
    ///         or the deadline has passed. Refunds the remaining budget to the researcher.
    function closeSurvey(uint256 surveyId) external nonReentrant {
        Survey storage s = surveys[surveyId];
        if (s.researcher == address(0)) revert SurveyNotFound();
        if (s.closed) revert AlreadyClosed();

        if (msg.sender != s.researcher) {
            bool agentMayClose = msg.sender == agent &&
                (s.paidCount == s.quota || block.timestamp > s.deadline);
            if (!agentMayClose) revert NotAllowed();
        }

        s.closed = true;
        uint256 refunded = s.balance;
        s.balance = 0;

        _send(s.researcher, refunded);
        emit Closed(surveyId, s.researcher, refunded);
    }

    /// @dev State is always updated before this is called.
    function _send(address to, uint256 amount) private {
        if (amount == 0) return;
        (bool ok, ) = to.call{value: amount}("");
        if (!ok) revert TransferFailed();
    }
}
