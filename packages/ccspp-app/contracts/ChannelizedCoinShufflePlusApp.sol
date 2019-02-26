pragma solidity 0.5;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/libs/Transfer.sol";
import "@counterfactual/contracts/contracts/CounterfactualApp.sol";

/// @title ChannelizedCoinShufflePlusApp
/// @author Alex Xiong - <alex.xiong.tech@gmail.com>
/// @notice A channelized CoinShuffle++ protocol in Counterfactual framework
contract ChannelizedCoinShufflePlusApp is CounterfactualApp {

  enum Round {
    KEY_EXCHANGE, COMMITMENT, DC_NET, CONFIRMATION, REVEAL_KEY
  }

//   enum ActionType {

//   }

  struct Action {
    ActionType actionType;

  }

  struct AppState {
    Round round;
    address[] peers;
    bytes[] npk;
    bytes[] commitments;
    bytes[] dcMessages;
    address[] recipents;
  }

  function isStateTerminal(bytes memory encodedState)
    public
    pure
    returns (bool)
  {

  }

  function getTurnTaker(bytes memory encodedState, address[] memory signingKeys)
    public
    pure
    returns (address)
  {

  }

  function applyAction(bytes memory encodedState, bytes memory encodedAction)
    public
    pure
    returns (bytes memory)
  {

  }

  function resolve(bytes memory encodedState, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {

  }
}
