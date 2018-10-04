pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "../lib/Transfer.sol";


/*
Normal-form Nim
https://en.wikipedia.org/wiki/Nim
*/
contract Nim {

  struct Action {
    uint256 pileIdx;
    uint256 takeAmnt;
  }

  struct AppState {
    address[2] players;
    uint256 turnNum;
    uint256[3] pileHeights;
  }

  function isStateTerminal(AppState state)
    public
    pure
    returns (bool)
  {
    return isWin(state);
  }

  function getTurnTaker(AppState state)
    public
    pure
    returns (uint256)
  {
    return state.turnNum % 2;
  }

  function applyAction(AppState state, Action action)
    public
    pure
    returns (bytes)
  {
    require(0 <= action.pileIdx);
    require(action.pileIdx < 3);
    require(state.pileHeights[action.pileIdx] >= action.takeAmnt);

    AppState memory ret = state;

    ret.pileHeights[action.pileIdx] -= action.takeAmnt;
    ret.turnNum += 1;

    return abi.encode(ret);
  }

  function resolve(AppState state, Transfer.TransactionLimit terms)
    public
    pure
    returns (Transfer.Transaction)
  {
    require(isWin(state));
    address winner = state.players[1 - (state.turnNum % 2)];

    return Transfer.make2PTransaction(
      terms,
      winner,
      terms.amount
    );
  }

  function isWin(AppState state)
    internal
    pure
    returns (bool)
  {
    return ((state.pileHeights[0] == 0) && (state.pileHeights[1] == 0) && (state.pileHeights[2] == 0));
  }


}
