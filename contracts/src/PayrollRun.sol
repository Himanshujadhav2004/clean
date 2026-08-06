// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PayrollVault.sol";
import "./RecordKeeper.sol";

/// @title PayrollRun
/// @notice Batch payroll with per-payee fault isolation (skip-and-log on failure).
contract PayrollRun {
    PayrollVault public immutable vault;
    RecordKeeper public recordKeeper;
    address public immutable deployer;

    struct Payee {
        address wallet;
        uint256 amount;
    }

    event PayrollRunExecuted(
        address indexed employer,
        uint256 runId,
        uint256 totalPaid,
        uint256 successCount,
        uint256 failCount
    );

    event PaymentFailed(address indexed employer, address indexed payee, uint256 amount, string reason);

    uint256 public nextRunId = 1;

    constructor(address _vault) {
        require(_vault != address(0), "PayrollRun: zero address");
        vault = PayrollVault(_vault);
        deployer = msg.sender;
    }

    function setRecordKeeper(address _recordKeeper) external {
        require(msg.sender == deployer, "PayrollRun: only deployer");
        require(address(recordKeeper) == address(0), "PayrollRun: already set");
        require(_recordKeeper != address(0), "PayrollRun: zero address");
        recordKeeper = RecordKeeper(_recordKeeper);
    }

    function runPayroll(Payee[] calldata payees) external returns (uint256 runId) {
        require(payees.length > 0, "PayrollRun: empty batch");

        runId = nextRunId++;
        uint256 totalPaid;
        uint256 successCount;
        uint256 failCount;

        for (uint256 i = 0; i < payees.length; i++) {
            Payee calldata p = payees[i];

            try vault.payOut(msg.sender, p.wallet, p.amount) {
                totalPaid += p.amount;
                successCount++;
                recordKeeper.recordPayment(msg.sender, p.wallet, p.amount, runId);
            } catch Error(string memory reason) {
                failCount++;
                emit PaymentFailed(msg.sender, p.wallet, p.amount, reason);
            } catch {
                failCount++;
                emit PaymentFailed(msg.sender, p.wallet, p.amount, "unknown error");
            }
        }

        emit PayrollRunExecuted(msg.sender, runId, totalPaid, successCount, failCount);
    }
}
