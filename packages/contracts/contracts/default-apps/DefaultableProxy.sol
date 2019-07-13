pragma solidity 0.5.10;
pragma experimental "ABIEncoderV2";

import "../interfaces/CounterfactualApp.sol";
import "../ChallengeRegistry.sol";


/*
Before `switchesOutcomeAt`, this contract should return the exact
same outcome as the outcome `targetAppIdentityHash` returns. However,
after `switchesOutcomeAt`, it should return `defaultOutcome`.

`challengeRegistryAddress` is used to look up the outcome.
*/
contract DefaultableProxy {

  struct AppState {
    address challengeRegistryAddress;
    bytes32 targetAppIdentityHash;
    uint256 switchesOutcomeAt;
    bytes defaultOutcome;
  }

  function computeOutcome(bytes calldata encodedState)
    external
    view
    returns (bytes memory)
  {
    AppState memory appState = abi.decode(encodedState, (AppState));
    if (block.number >= appState.switchesOutcomeAt) {
      return appState.defaultOutcome;
    } else {
      return ChallengeRegistry(appState.challengeRegistryAddress).getOutcome(appState.targetAppIdentityHash);
    }
  }
}
