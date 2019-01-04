pragma solidity 0.5;
pragma experimental "ABIEncoderV2";

import "./mixins/MixinAppRegistryCore.sol";
import "./mixins/MixinCancelChallenge.sol";
import "./mixins/MixinSetResolution.sol";
import "./mixins/MixinSetState.sol";
import "./mixins/MixinSetStateWithAction.sol";


/// @dev Base contract implementing all logic needed for full-featured App registry
contract AppRegistry is
  MixinAppRegistryCore,
  MixinSetState,
  MixinSetStateWithAction,
  MixinCancelChallenge,
  MixinSetResolution
{
  constructor () public {}
}
