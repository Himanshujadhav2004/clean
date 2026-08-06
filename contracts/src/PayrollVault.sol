// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title PayrollVault
/// @notice Holds an employer's CVA (Cleanverse A-Token) balance, earmarked for payroll.
contract PayrollVault is Ownable, ReentrancyGuard {
    IERC20 public immutable cva;

    mapping(address => uint256) public balanceOf;

    address public payrollRun;

    event Deposited(address indexed employer, uint256 amount);
    event Withdrawn(address indexed employer, uint256 amount);
    event Debited(address indexed employer, address indexed to, uint256 amount);
    event PayrollRunSet(address indexed payrollRun);

    modifier onlyPayrollRun() {
        require(msg.sender == payrollRun, "PayrollVault: caller is not PayrollRun");
        _;
    }

    constructor(address _cva) Ownable(msg.sender) {
        require(_cva != address(0), "PayrollVault: cva address required");
        cva = IERC20(_cva);
    }

    function setPayrollRun(address _payrollRun) external onlyOwner {
        require(_payrollRun != address(0), "PayrollVault: zero address");
        payrollRun = _payrollRun;
        emit PayrollRunSet(_payrollRun);
    }

    function deposit(uint256 amount) external nonReentrant {
        require(amount > 0, "PayrollVault: amount must be > 0");
        balanceOf[msg.sender] += amount;
        require(cva.transferFrom(msg.sender, address(this), amount), "PayrollVault: transferFrom failed");
        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        require(balanceOf[msg.sender] >= amount, "PayrollVault: insufficient balance");
        balanceOf[msg.sender] -= amount;
        require(cva.transfer(msg.sender, amount), "PayrollVault: transfer failed");
        emit Withdrawn(msg.sender, amount);
    }

    function payOut(address employer, address to, uint256 amount) external onlyPayrollRun nonReentrant {
        require(balanceOf[employer] >= amount, "PayrollVault: insufficient employer balance");
        balanceOf[employer] -= amount;
        require(cva.transfer(to, amount), "PayrollVault: CVA transfer failed (payee may be non-compliant)");
        emit Debited(employer, to, amount);
    }
}
