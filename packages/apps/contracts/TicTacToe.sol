pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "@counterfactual/contracts/contracts/lib/Transfer.sol";


contract TicTacToe {

  enum ActionType {
    PLAY,
    PLAY_AND_WIN,
    PLAY_AND_DRAW,
    DRAW
  }

  enum WinClaimType {
    COL,
    ROW,
    DIAG,
    CROSS_DIAG
  }

  struct WinClaim {
    WinClaimType winClaimType;
    uint256 winClaimIdx;
  }

  struct AppState {
    address[2] players;
    uint256 turnNum;
    uint256 winner; // 0 => game in progress, 3 => drawn, i => player[i-1] won otherwise
    uint256[3][3] board; // 0 => empty square, i => players[i-1] otherwise
  }

  struct Action {
    ActionType actionType;
    uint256 playX;
    uint256 playY;
    WinClaim winClaim;
  }

  function turn(AppState state)
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
    AppState memory postState;
    if (action.actionType == ActionType.PLAY) {
      postState = playMove(state, state.turnNum % 2, action.playX, action.playY);
    } else if (action.actionType == ActionType.PLAY_AND_WIN) {
      postState = playMove(state, state.turnNum % 2, action.playX, action.playY);
      assertWin(state.turnNum % 2, postState, action.winClaim);
      postState.winner = (postState.turnNum % 2) + 1;
    } else if (action.actionType == ActionType.PLAY_AND_DRAW) {
      postState = playMove(state, state.turnNum % 2, action.playX, action.playY);
      assertBoardIsFull(postState);
      postState.winner = 3;
    } else if (action.actionType == ActionType.DRAW) {
      assertBoardIsFull(state);
      postState = state;
      postState.winner = 3;
    }

    postState.turnNum += 1;

    return abi.encode(postState);
  }

  function resolve(AppState state, Transfer.Terms terms)
    public
    pure
    returns (Transfer.Details)
  {
    require(state.winner != 0);

    uint256[] memory amounts = new uint256[](2);
    address[] memory to = new address[](2);
    bytes memory data; // = 0

    if (state.winner == 3) {
      amounts[0] = terms.limit / 2;
      amounts[1] = terms.limit / 2;

      to[0] = state.players[0];
      to[1] = state.players[1];

      return Transfer.Details(
        terms.assetType,
        terms.token,
        to,
        amounts,
        data
      );

    } else {
      address loser = state.players[state.winner - 1];
      address winner = state.players[2 - state.winner];

      amounts[0] = terms.limit;
      amounts[1] = 0;

      to[0] = loser;
      to[1] = winner;

      return Transfer.Details(
        terms.assetType,
        terms.token,
        to,
        amounts,
        data
      );
    }

  }

  function playMove(
    AppState state, uint256 playerId, uint256 x, uint256 y
  ) internal pure returns (AppState) {
    require(state.board[x][y] == 0, "playMove: square is not empty");
    require(playerId == 0 || playerId == 1, "playMove: playerId not in range [0, 1]");

    state.board[x][y] = playerId + 1;

    return state;
  }

  function assertBoardIsFull(AppState preState) internal pure {
    for (uint256 i=0; i<3; i++) {
      for (uint256 j=0; j<3; j++) {
        require(preState.board[i][j] != 0, "assertBoardIsFull: square is empty");
      }
    }
  }

  function assertWin(uint256 playerId, AppState state, WinClaim winClaim) internal pure {
    if (winClaim.winClaimType == WinClaimType.COL) {
      require(state.board[winClaim.winClaimIdx][0] == playerId + 1, "assertWin failed");
      require(state.board[winClaim.winClaimIdx][1] == playerId + 1, "assertWin failed");
      require(state.board[winClaim.winClaimIdx][2] == playerId + 1, "assertWin failed");
    } else if (winClaim.winClaimType == WinClaimType.ROW) {
      require(state.board[0][winClaim.winClaimIdx] == playerId + 1, "assertWin failed");
      require(state.board[1][winClaim.winClaimIdx] == playerId + 1, "assertWin failed");
      require(state.board[2][winClaim.winClaimIdx] == playerId + 1, "assertWin failed");
    } else if (winClaim.winClaimType == WinClaimType.DIAG) {
      require(state.board[0][0] == playerId + 1, "assertWin failed");
      require(state.board[1][1] == playerId + 1, "assertWin failed");
      require(state.board[2][2] == playerId + 1, "assertWin failed");
    } else if (winClaim.winClaimType == WinClaimType.CROSS_DIAG) {
      require(state.board[2][0] == playerId + 1, "assertWin failed");
      require(state.board[1][1] == playerId + 1, "assertWin failed");
      require(state.board[0][2] == playerId + 1, "assertWin failed");
    }
  }

}
