pragma solidity 0.5.7;
pragma experimental "ABIEncoderV2";

import "./mixins/MixinAppRegistryCore.sol";
import "./mixins/MixinCancelChallenge.sol";
import "./mixins/MixinSetResolution.sol";
import "./mixins/MixinSetState.sol";
import "./mixins/MixinVirtualAppSetState.sol";
import "./mixins/MixinSetStateWithAction.sol";
import "./mixins/MixinProgressChallenge.sol";


/// @dev Base contract implementing all logic needed for full-featured App registry
contract AppRegistry is
  MixinAppRegistryCore,
  MixinSetState,
  MixinVirtualAppSetState,
  MixinSetStateWithAction,
  MixinCancelChallenge,
  MixinProgressChallenge,
  MixinSetResolution
{
  // solium-disable-next-line no-empty-blocks
  constructor () public {}
}
