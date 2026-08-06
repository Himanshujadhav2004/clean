// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Stand-in for Cleanverse A-Token in local tests.
contract MockCVA is ERC20 {
    mapping(address => bool) public blocked;

    constructor() ERC20("Mock aUSDC", "maUSDC") {
        _mint(msg.sender, 1_000_000 ether);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function setBlocked(address account, bool isBlocked) external {
        blocked[account] = isBlocked;
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        require(!blocked[to], "MockCVA: payee blocked (non-compliant)");
        return super.transfer(to, amount);
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(!blocked[to], "MockCVA: payee blocked (non-compliant)");
        return super.transferFrom(from, to, amount);
    }
}
