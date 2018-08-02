pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/lib/Transfer.sol";


/*
Normal-form Nim
https://en.wikipedia.org/wiki/Nim

Untested!
*/
contract Nim {

  enum ActionTypes { INCREMENT, DECREMENT}

  struct Action {
    uint256 pileIdx;
    uint256 takeAmnt;
  }

  struct AppState {
    address[2] players;
    uint256 turnNum;
    uint256[3] pileHeights;
  }

  function isStateFinal(AppState state)
    public
    pure
    returns (bool)
  {
    return isWin(state);
  }

  function isWin(AppState state)
    internal
    pure
    returns (bool)
  {
    return (
      (state.pileHeights[0] == 0) &&
      (state.pileHeights[1] == 0) &&
      (state.pileHeights[2] == 0)
    );
  }

  function turn(AppState state)
    public
    pure
    returns (uint256)
  {
    return state.turnNum % 2;
  }

  function reducer(AppState state, Action action)
    public
    view
    returns (bytes)
  {
    require(0 <= action.pileIdx);
    require(action.pileIdx < 3);
    require(state.pileHeights[action.pileIdx] >= action.takeAmnt);

    AppState memory ret = state;

    ret.pileHeights[action.pileIdx] -= action.takeAmnt;

    return abi.encode(ret);
  }

  function resolver(AppState state, Transfer.Terms terms)
    public
    pure
    returns (Transfer.Details)
  {
    require(isWin(state));
    address loser = state.players[state.turnNum % 2];
    address winner = state.players[1 - (state.turnNum % 2)];

    uint256[] memory amounts = new uint256[](2);
    amounts[0] = terms.limit;
    amounts[1] = 0;

    address[] memory to = new address[](2);
    to[0] = loser;
    to[1] = winner;
    bytes memory data; // = 0

    return Transfer.Details(
      terms.assetType,
      terms.token,
      to,
      amounts,
      data
    );
  }

}
