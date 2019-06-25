pragma solidity 0.5.9;
pragma experimental "ABIEncoderV2";

import "./MChallengeRegistryCore.sol";


contract MixinTransfer {

  function transferAll(
    AppIdentity calldata appIdentity
  )
    external
  {

    bytes32 appIdentityHash = hash(appIdentity);

    LibStateChannelApp.Allocation outcome = appOutcomes[appIdentityHash];

    for (uint256 i = 0; i < outcome.destinations.length; i++) {

      bytes32 destination = outcome.destinations[i];
      PileOfTokens memory balance = outcome.balances[i];

      if (isActuallyAnAddress(destination)) {
        personalHoldings[appIdentity.owningMultisig][destination].add(/* ... */)
      } else {
        appHoldings[destination].add(/* ... */)
      }

    }

  }
}
