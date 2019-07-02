pragma solidity 0.5.10;
pragma experimental ABIEncoderV2;

import "./MAppInstanceAdjudicatorCore.sol";
import "./MixinChallenge.sol";
import "./MixinChallengeUnanimous.sol";
import "./MixinRefute.sol";
import "./MixinRespondWithMove.sol";
import "./MixinAlternativeRespondWithMove.sol";
import "./MixinConclude.sol";


// solium-disable-next-line no-empty-blocks
contract AppInstanceAdjudicator is
  MAppInstanceAdjudicatorCore,
  MixinChallenge,
  MixinChallengeUnanimous,
  MixinRefute,
  MixinRespondWithMove,
  MixinAlternativeRespondWithMove,
  MixinConclude
{}
