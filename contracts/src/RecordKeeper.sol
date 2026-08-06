// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title RecordKeeper
/// @notice Emits structured events per successful payroll payment for off-chain indexing.
contract RecordKeeper {
    address public immutable payrollRun;

    struct PaymentRecord {
        address employer;
        address payee;
        uint256 amount;
        uint256 runId;
        uint256 timestamp;
    }

    mapping(uint256 => PaymentRecord[]) public paymentsByRun;

    event PaymentRecorded(
        address indexed employer,
        address indexed payee,
        uint256 amount,
        uint256 indexed runId,
        uint256 timestamp
    );

    modifier onlyPayrollRun() {
        require(msg.sender == payrollRun, "RecordKeeper: caller is not PayrollRun");
        _;
    }

    constructor(address _payrollRun) {
        require(_payrollRun != address(0), "RecordKeeper: zero address");
        payrollRun = _payrollRun;
    }

    function recordPayment(address employer, address payee, uint256 amount, uint256 runId) external onlyPayrollRun {
        paymentsByRun[runId].push(
            PaymentRecord({employer: employer, payee: payee, amount: amount, runId: runId, timestamp: block.timestamp})
        );
        emit PaymentRecorded(employer, payee, amount, runId, block.timestamp);
    }

    function getPaymentsForRun(uint256 runId) external view returns (PaymentRecord[] memory) {
        return paymentsByRun[runId];
    }
}
