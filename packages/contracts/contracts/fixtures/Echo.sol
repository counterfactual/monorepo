pragma solidity 0.4.25;


contract Echo {
  function helloWorld() external pure returns (string) {
    return "hello world";
  }

  function helloWorldArg(string arg) external pure returns (string) {
    return arg;
  }

  function msgSender() external view returns (address) {
    return msg.sender;
  }

  function returnArg(bool arg) external pure returns (bool) {
    return arg;
  }
}
