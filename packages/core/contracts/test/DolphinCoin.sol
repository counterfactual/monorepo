pragma solidity 0.4.24;

import "openzeppelin-solidity/contracts/token/ERC20/StandardToken.sol";

contract DolphinCoin is StandardToken {
  string public name = "DolphinCoin";
  string public symbol = "DCOIN";
  uint8 public decimals = 2;
  uint public INITIAL_SUPPLY = 300000;

  constructor() public {
    totalSupply_ = INITIAL_SUPPLY;
    balances[msg.sender] = INITIAL_SUPPLY;
  }
}
