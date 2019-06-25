pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "../libs/LibStateChannelApp.sol";

contract MChallengeRegistryCore {

  // A mapping of appIdentityHash to AppChallenge structs which represents
  // the latest valid app state that the Challenge Registry knows about. This
  // latest valid app state could be arrived at through unanimous signatures
  // or unilateral applyActions.
  mapping (bytes32 => LibStateChannelApp.AppChallenge) public appChallenges;

  // A mapping of appIdentityHash to finalized outcomes
  mapping (bytes32 => LibStateChannelApp.Allocation) public appOutcomes;
}
