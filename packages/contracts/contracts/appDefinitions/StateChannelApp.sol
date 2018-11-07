pragma solidity 0.4.25;
pragma experimental "v0.5.0";
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";


interface StateChannelApp {

  function isStateTerminal(bytes)
    external
    pure
    returns (bool);

  function getTurnTaker(bytes, address[])
    external
    pure
    returns (address);

  function applyAction(bytes, bytes)
    external
    pure
    returns (bytes);

  function resolve(bytes, Transfer.Terms)
    external
    pure
    returns (Transfer.Transaction);

}
