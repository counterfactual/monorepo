import { ethers } from "ethers";

import { AbstractContract, expect } from "../../utils";
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

contract("TicTacToe", (accounts: string[]) => {
  let game: ethers.Contract;

  const stateEncoding =
    "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)";

  // @ts-ignore
  before(async () => {
    const ticTacToe = await AbstractContract.fromArtifactName("TicTacToeApp");
    game = await ticTacToe.deploy(unlockedAccount);
  });

  describe("applyAction", () => {
    it("can place into an empty board", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
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

      const ret = await game.functions.applyAction(preState, action);

      const state = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      expect(state.board[0][0]).to.be.eql(new ethers.utils.BigNumber(1));
      expect(state.turnNum).to.be.eql(new ethers.utils.BigNumber(1));
    });

    it("can place into an empty square", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 1,
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

      const ret = await game.functions.applyAction(preState, action);

      const state = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      expect(state.board[1][1]).to.be.eql(new ethers.utils.BigNumber(2));
      expect(state.turnNum).to.be.eql(new ethers.utils.BigNumber(2));
    });

    it("cannot placeinto an occupied square", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
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

      await Utils.assertRejects(game.functions.applyAction(preState, action));
    });

    it("can draw from a full board", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
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

      const ret = await game.functions.applyAction(preState, action);

      const state = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      expect(state.winner).to.be.eql(new ethers.utils.BigNumber(3)); // DRAWN
    });

    it("cannot draw from a non-full board", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
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

      await Utils.assertRejects(game.functions.applyAction(preState, action));
    });

    it("can play_and_draw from an almost full board", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
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

      const ret = await game.functions.applyAction(preState, action);

      const state = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      expect(state.winner).to.be.eql(new ethers.utils.BigNumber(3)); // DRAWN
    });

    it("can notplay_and_draw from a sparse board", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
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

      await Utils.assertRejects(game.functions.applyAction(preState, action));
    });

    it("can play_and_win from a winning position", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
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

      const ret = await game.functions.applyAction(preState, action);

      const state = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      expect(state.winner).to.be.eql(new ethers.utils.BigNumber(1)); // WON
    });

    it("cannot play_and_win from a non winning position", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
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

      await Utils.assertRejects(game.functions.applyAction(preState, action));
    });
  });
});
