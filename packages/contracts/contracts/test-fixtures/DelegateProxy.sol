pragma solidity 0.5.7;


contract DelegateProxy {
  function () external payable { }
  function delegate(address to, bytes memory data) public {
    // solium-disable-next-line no-unused-vars
    (bool success, bytes memory _) = to.delegatecall(data);
    require(success, "Delegate call failed.");
  }
}
