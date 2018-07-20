pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

contract InheritedThing {
  enum StateFlags { IN_PROGRESS, CONCLUDED }
  function dispatch(bytes4 selector, bytes state, bytes action) {
    address(this).staticcall(abi.encodePacked(selector, state, action));
  }
}
