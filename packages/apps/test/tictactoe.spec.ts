import { SolidityABIEncoderV2Type } from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { defaultAbiCoder } from "ethers/utils";

import TicTacToeApp from "../build/TicTacToeApp.json";

chai.use(waffle.solidity);

const { expect } = chai;

type TicTacToeAppState = {
  versionNumber: number;
  winner: number;
  board: number[][];
};

function decodeBytesToAppState(encodedAppState: string): TicTacToeAppState {
  return defaultAbiCoder.decode(
    ["tuple(uint256 versionNumber, uint256 winner, uint256[3][3] board)"],
    encodedAppState
  )[0];
}

describe("TicTacToeApp", () => {
  let ticTacToe: Contract;

  async function computeOutcome(state: SolidityABIEncoderV2Type) {
    return await ticTacToe.functions.computeOutcome(encodeState(state));
  }

  function encodeState(state: SolidityABIEncoderV2Type) {
    return defaultAbiCoder.encode(
      [
        `
        tuple(
          uint256 versionNumber,
          uint256 winner,
          uint256[3][3] board
        )
      `
      ],
      [state]
    );
  }

  function encodeAction(state: SolidityABIEncoderV2Type) {
    return defaultAbiCoder.encode(
      [
        `
        tuple(
          uint8 actionType,
          uint256 playX,
          uint256 playY,
          tuple(
            uint8 winClaimType,
            uint256 idx
          ) winClaim
        )
      `
      ],
      [state]
    );
  }

  async function applyAction(
    state: SolidityABIEncoderV2Type,
    action: SolidityABIEncoderV2Type
  ) {
    return await ticTacToe.functions.applyAction(
      encodeState(state),
      encodeAction(action)
    );
  }

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    ticTacToe = await waffle.deployContract(wallet, TicTacToeApp);
  });

  describe("applyAction", () => {
    it("can place into an empty board", async () => {
      const preState = {
        versionNumber: 0,
        winner: 0,
        board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
      };

      const action = {
        actionType: 0,
        playX: 0,
        playY: 0,
        winClaim: {
          winClaimType: 0,
          idx: 0
        }
      };

      const ret = await applyAction(preState, action);

      const state = decodeBytesToAppState(ret);

      expect(state.board[0][0]).to.eq(1);
      expect(state.versionNumber).to.eq(1);
    });

    it("can place into an empty square", async () => {
      const preState = {
        versionNumber: 1,
        winner: 0,
        board: [[1, 0, 0], [0, 0, 0], [0, 0, 0]]
      };

      const action = {
        actionType: 0,
        playX: 1,
        playY: 1,
        winClaim: {
          winClaimType: 0,
          idx: 0
        }
      };

      const ret = await applyAction(preState, action);

      const state = decodeBytesToAppState(ret);

      expect(state.board[1][1]).to.eq(2);
      expect(state.versionNumber).to.eq(2);
    });

    it("cannot placeinto an occupied square", async () => {
      const preState = {
        versionNumber: 0,
        winner: 0,
        board: [[1, 0, 0], [0, 0, 0], [0, 0, 0]]
      };

      const action = {
        actionType: 0,
        playX: 0,
        playY: 0,
        winClaim: {
          winClaimType: 0,
          idx: 0
        }
      };

      await expect(applyAction(preState, action)).to.be.revertedWith(
        "playMove: square is not empty"
      );
    });

    it("can draw from a full board", async () => {
      const preState = {
        versionNumber: 0,
        winner: 0,
        board: [[1, 2, 1], [1, 2, 2], [2, 1, 2]]
      };

      const action = {
        actionType: 3, // DRAW
        playX: 0,
        playY: 0,
        winClaim: {
          winClaimType: 0,
          idx: 0
        }
      };

      const ret = await applyAction(preState, action);

      const state = decodeBytesToAppState(ret);

      expect(state.winner).to.eq(3); // DRAWN
    });

    it("cannot draw from a non-full board", async () => {
      const preState = {
        versionNumber: 0,
        winner: 0,
        board: [[1, 2, 1], [1, 0, 2], [2, 1, 2]]
      };

      const action = {
        actionType: 3, // DRAW
        playX: 0,
        playY: 0,
        winClaim: {
          winClaimType: 0,
          idx: 0
        }
      };

      await expect(applyAction(preState, action)).to.be.revertedWith(
        "assertBoardIsFull: square is empty"
      );
    });

    it("can play_and_draw from an almost full board", async () => {
      const preState = {
        versionNumber: 0,
        winner: 0,
        board: [[0, 2, 1], [1, 2, 2], [2, 1, 2]]
      };

      const action = {
        actionType: 2, // PLAY_AND_DRAW
        playX: 0,
        playY: 0,
        winClaim: {
          winClaimType: 0,
          idx: 0
        }
      };

      const ret = await applyAction(preState, action);

      const state = decodeBytesToAppState(ret);

      expect(state.winner).to.eq(3); // DRAWN
    });

    it("cannot play_and_draw from a sparse board", async () => {
      const preState = {
        versionNumber: 0,
        winner: 0,
        board: [[0, 2, 1], [1, 2, 2], [2, 0, 0]]
      };

      const action = {
        actionType: 2, // PLAY_AND_DRAW
        playX: 0,
        playY: 0,
        winClaim: {
          winClaimType: 0,
          idx: 0
        }
      };

      await expect(applyAction(preState, action)).to.be.revertedWith(
        "assertBoardIsFull: square is empty"
      );
    });

    it("can play_and_win from a winning position", async () => {
      const preState = {
        versionNumber: 0,
        winner: 0,
        board: [[1, 1, 0], [0, 0, 0], [0, 0, 0]]
      };

      const action = {
        actionType: 1, // PLAY_AND_WIN
        playX: 0,
        playY: 2,
        winClaim: {
          winClaimType: 0, // COL
          idx: 0
        }
      };

      const ret = await applyAction(preState, action);

      const state = decodeBytesToAppState(ret);

      expect(state.winner).to.eq(1); // WON
    });

    it("cannot play_and_win from a non winning position", async () => {
      const preState = {
        versionNumber: 0,
        winner: 0,
        board: [[1, 0, 0], [0, 0, 0], [0, 0, 0]]
      };

      const action = {
        actionType: 1, // PLAY_AND_WIN
        playX: 0,
        playY: 2,
        winClaim: {
          winClaimType: 0, // COL
          idx: 0
        }
      };

      await expect(applyAction(preState, action)).to.be.revertedWith(
        "Win Claim not valid"
      );
    });
  });
  describe("computeOutcome", () => {
    it("playerFirst wins should compute the outcome correctly", async () => {
      const preState = {
        versionNumber: 0,
        winner: 0,
        board: [[1, 1, 0], [0, 0, 0], [0, 0, 0]]
      };

      const action = {
        actionType: 1, // PLAY_AND_WIN
        playX: 0,
        playY: 2,
        winClaim: {
          winClaimType: 0, // COL
          idx: 0
        }
      };

      const appliedAction = await applyAction(preState, action);
      const state = decodeBytesToAppState(appliedAction);

      const ret = await computeOutcome(state);

      expect(ret).to.eq(defaultAbiCoder.encode(["uint256"], [0]));
    });
  });
});
