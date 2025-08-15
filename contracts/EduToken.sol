// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract EduToken is ERC20, Ownable {
    uint256 public immutable maxSupply;
    address public minter;

    event MinterSet(address indexed minter);

    constructor(string memory name_, string memory symbol_, uint256 maxSupply_)
        ERC20(name_, symbol_)
        Ownable(msg.sender)
    {
        require(maxSupply_ > 0, "cap=0");
        maxSupply = maxSupply_;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "not minter");
        _;
    }

    function setMinter(address m) external onlyOwner {
        minter = m;
        emit MinterSet(m);
    }

    function mint(address to, uint256 amount) external onlyMinter {
        require(totalSupply() + amount <= maxSupply, "cap exceeded");
        _mint(to, amount);
    }
}
