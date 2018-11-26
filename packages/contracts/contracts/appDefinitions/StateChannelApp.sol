pragma solidity 0.5;
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";


contract StateChannelApp {

  function isStateTerminal(bytes memory)
    public
    pure
    returns (bool);

  function getTurnTaker(bytes memory, address[] memory)
    public
    pure
    returns (address);

  function applyAction(bytes memory, bytes memory)
    public
    pure
    returns (bytes memory);

  function resolve(bytes memory, Transfer.Terms memory)
    public
    pure
    returns (Transfer.Transaction memory);

}
