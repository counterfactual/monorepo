pragma solidity 0.5;


contract DelegateProxy {
  function () external payable { }
  function delegate(address to, bytes memory data) public {
    (bool success, bytes memory ret) = to.delegatecall(data);
    require(success, "Delegate call failed.");
  }
}
