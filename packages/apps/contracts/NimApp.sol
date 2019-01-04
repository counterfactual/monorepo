pragma solidity 0.5;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/libs/Transfer.sol";


/*
Normal-form Nim
https://en.wikipedia.org/wiki/Nim
*/
contract NimApp {

  struct Action {
    uint256 pileIdx;
    uint256 takeAmnt;
  }

  struct AppState {
    address[2] players;
    uint256 turnNum;
    uint256[3] pileHeights;
  }

  function isStateTerminal(AppState memory state)
    public
    pure
    returns (bool)
  {
    return isWin(state);
  }

  function getTurnTaker(AppState memory state)
    public
    pure
    returns (uint256)
  {
    return state.turnNum % 2;
  }

  function applyAction(AppState memory state, Action memory action)
    public
    pure
    returns (bytes memory)
  {
    require(action.pileIdx < 3, "pileIdx must be 0, 1 or 2");
    require(
      state.pileHeights[action.pileIdx] >= action.takeAmnt, "invalid pileIdx"
    );

    AppState memory ret = state;

    ret.pileHeights[action.pileIdx] -= action.takeAmnt;
    ret.turnNum += 1;

    return abi.encode(ret);
  }

  function resolve(AppState memory state, Transfer.Terms memory terms)
    public
    pure
    returns (Transfer.Transaction memory)
  {
    require(isWin(state), "Resolution state was not in a winning position");
    address loser = state.players[state.turnNum % 2];
    address winner = state.players[1 - (state.turnNum % 2)];

    uint256[] memory amounts = new uint256[](2);
    amounts[0] = terms.limit;
    amounts[1] = 0;

    address[] memory to = new address[](2);
    to[0] = loser;
    to[1] = winner;
    bytes[] memory data = new bytes[](2);

    return Transfer.Transaction(
      terms.assetType,
      terms.token,
      to,
      amounts,
      data
    );
  }

  function isWin(AppState memory state)
    internal
    pure
    returns (bool)
  {
    return (
      (state.pileHeights[0] == 0) && (state.pileHeights[1] == 0) && (state.pileHeights[2] == 0)
    );
  }


}
