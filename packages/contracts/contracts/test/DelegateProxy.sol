pragma solidity 0.4.25;


contract DelegateProxy {
  function () public payable { }
  function delegate(address to, bytes data) public {
    require(to.delegatecall(data), "Delegate call failed.");
  }
}
