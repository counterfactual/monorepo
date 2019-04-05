pragma solidity ^0.5.5;


/// @notice utility library for bytes1 as nibble type
library LibNibble {
  function isNibble(bytes1 b) public pure returns(bool) {
    return uint8(b>>4) == 0;
  }

  /// @notice extract nibble from a bytes1
  /// @dev b the bytes to extract from
  /// @dev first returns the first nibble if set to true
  function toNibble(bytes1 b, bool first)
    public
    pure
    returns (bytes1)
  {
    if (first) return b>>4;
    return b & hex"0f";
  }

  function nibbleToChar(bytes1 b) public pure returns (bytes1){
    require(isNibble(b), "input is not a nibble!");

    if (uint8(b)<10) {
      return bytes1(48+uint8(b));
    } else {
      return bytes1(87+uint8(b));
    }
  }
}
