pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "./mixins/MixinChallengeRegistryCore.sol";
import "./mixins/MixinCancelChallenge.sol";
import "./mixins/MixinSetOutcome.sol";
import "./mixins/MixinSetState.sol";
import "./mixins/MixinVirtualAppSetState.sol";
import "./mixins/MixinSetStateWithAction.sol";
import "./mixins/MixinRespondToChallenge.sol";


/// @dev Base contract implementing all logic needed for full-featured App registry
contract ChallengeRegistry is
  MixinChallengeRegistryCore,
  MixinSetState,
  MixinVirtualAppSetState,
  MixinSetStateWithAction,
  MixinCancelChallenge,
  MixinRespondToChallenge,
  MixinSetOutcome
{
  // solium-disable-next-line no-empty-blocks
  constructor () public {}
}
