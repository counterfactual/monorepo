import * as ethers from "ethers";

import * as Utils from "@counterfactual/test-utils";

const TicTacToe = artifacts.require("TicTacToe");

const StaticCall = artifacts.require("StaticCall");

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

contract("TicTacToe", (accounts: string[]) => {
  let game: ethers.Contract;

  const stateEncoding =
    "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)";

  before(async () => {
    const contract = new ethers.Contract("", TicTacToe.abi, unlockedAccount);
    TicTacToe.link("StaticCall", StaticCall.address);
    game = await contract.deploy(TicTacToe.binary);
  });

  describe("applyAction", () => {
    it("can place into an empty board", async () => {
      const preState = {
        players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
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

      state.board[0][0].should.be.bignumber.eq(1);
      state.turnNum.should.be.bignumber.eq(1);
    });

    it("can place into an empty square", async () => {
      const preState = {
        players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
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

      state.board[1][1].should.be.bignumber.eq(2);
      state.turnNum.should.be.bignumber.eq(2);
    });

    it("cannot placeinto an occupied square", async () => {
      const preState = {
        players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
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
        players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
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

      state.winner.should.be.bignumber.eq(3); // DRAWN
    });

    it("cannot draw from a non-full board", async () => {
      const preState = {
        players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
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
        players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
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

      state.winner.should.be.bignumber.eq(3); // DRAWN
    });

    it("can notplay_and_draw from a sparse board", async () => {
      const preState = {
        players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
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
        players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
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

      state.winner.should.be.bignumber.eq(1); // WON
    });

    it("cannot play_and_win from a non winning position", async () => {
      const preState = {
        players: [Utils.ZERO_ADDRESS, Utils.ZERO_ADDRESS],
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
