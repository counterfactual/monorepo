pragma solidity ^0.5.5;
pragma experimental ABIEncoderV2;

import "./LibNibble.sol";


contract LibBytesString {

  /// @notice converting address type to string
  function addressToString(address a) public pure returns(string memory){
    string memory str = new string(42);
    bytes memory b = new bytes(40);
    bytes1[] memory charArray = bytes20ToCharArray(bytes20(a));
    for (uint i = 0; i<40; i++) {
      b[i] = charArray[i];
    }
    str = string(abi.encodePacked(bytes("0x"), b));
    return str;
  }

  /// @notice converting bytes20 into an UTF-8 array in hex
  function bytes20ToCharArray(bytes20 b) public pure returns(bytes1[] memory){
    bytes1[] memory ret = new bytes1[](40);
    for (uint i = 0; i<20; i++){
      ret[2*i] = LibNibble.nibbleToChar(LibNibble.toNibble(b[i], true));
      ret[2*i+1] = LibNibble.nibbleToChar(LibNibble.toNibble(b[i], false));
    }
    return ret;
  }
  // TODO: all other byte type conversion
}
