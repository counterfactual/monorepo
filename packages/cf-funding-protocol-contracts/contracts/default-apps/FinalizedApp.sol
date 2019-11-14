pragma solidity 0.5.12;
pragma experimental "ABIEncoderV2";

import "./IdentityApp.sol";


contract FinalizedApp is IdentityApp {

  function isStateTerminal(bytes memory)
    public
    pure
    returns (bool)
  {
    return true;
  }

}
