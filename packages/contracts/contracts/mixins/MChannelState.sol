pragma solidity 0.5.8;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";


contract MChannelState {

  /// @notice Compute the logical turn taker for some ChannelState
  /// @param channelState A `ChannelState` struct
  /// @return An address, the logical turn taker
  function getTurnTaker(
    LibStateChannelApp.ChannelState memory channelState
  )
    internal
    pure
    returns (address)
  {
    return channelState.participants[
      channelState.turnNum % channelState.participants.length
    ];
  }


}
