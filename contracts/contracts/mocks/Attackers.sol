// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

// Test-only helpers for SurveyEscrow reentrancy and transfer-failure tests. Never deployed.

import {SurveyEscrow} from "../SurveyEscrow.sol";

/// Respondent contract that, when paid, tries to re-enter recordDecision and closeSurvey.
/// The re-entry results are recorded instead of reverting, so the outer payment can complete.
contract ReentrantRespondent {
    SurveyEscrow public immutable escrow;
    uint256 public surveyId;
    bool public reenterDecisionOk;
    bool public reenterCloseOk;
    uint256 public receiveCount;

    constructor(SurveyEscrow escrow_) {
        escrow = escrow_;
    }

    function setSurvey(uint256 id) external {
        surveyId = id;
    }

    receive() external payable {
        receiveCount += 1;
        (reenterDecisionOk, ) = address(escrow).call(
            abi.encodeCall(SurveyEscrow.recordDecision, (surveyId, address(this), SurveyEscrow.Decision.Pay, bytes32(0)))
        );
        (reenterCloseOk, ) = address(escrow).call(abi.encodeCall(SurveyEscrow.closeSurvey, (surveyId)));
    }
}

/// Researcher contract that, when refunded, tries to close again and to record a decision.
contract ReentrantResearcher {
    SurveyEscrow public immutable escrow;
    uint256 public surveyId;
    bool public reenterCloseOk;
    bool public reenterDecisionOk;
    uint256 public receiveCount;

    constructor(SurveyEscrow escrow_) {
        escrow = escrow_;
    }

    function fund(
        bytes32 surveyHash,
        uint256 rate,
        uint256 quota,
        uint256 deadline,
        uint256 feePerResponse
    ) external payable {
        surveyId = escrow.createSurvey{value: msg.value}(surveyHash, rate, quota, deadline, feePerResponse);
    }

    function close() external {
        escrow.closeSurvey(surveyId);
    }

    receive() external payable {
        receiveCount += 1;
        (reenterCloseOk, ) = address(escrow).call(abi.encodeCall(SurveyEscrow.closeSurvey, (surveyId)));
        (reenterDecisionOk, ) = address(escrow).call(
            abi.encodeCall(SurveyEscrow.recordDecision, (surveyId, address(this), SurveyEscrow.Decision.Pay, bytes32(0)))
        );
    }
}

/// Address that rejects every transfer.
contract RejectingReceiver {
    receive() external payable {
        revert("no");
    }
}
