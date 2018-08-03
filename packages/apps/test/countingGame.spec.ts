import * as ethers from "ethers";

import * as Utils from "@counterfactual/test-utils";

const CountingApp = artifacts.require("CountingApp");

const StaticCall = artifacts.require("StaticCall");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

contract("CountingApp", (accounts: string[]) => {
  let game: ethers.Contract;

  enum ActionTypes {
    INCREMENT,
    DECREMENT
  }

  const stateEncoding =
    "tuple(address player1, address player2, uint256 count, uint256 turnNum)";

  beforeEach(async () => {
    const contract = new ethers.Contract("", CountingApp.abi, unlockedAccount);
    CountingApp.link("StaticCall", StaticCall.address);
    game = await contract.deploy(CountingApp.binary);
  });

  describe("applyAction", () => {
    it("should work for increment", async () => {
      const baseState = {
        player1: Utils.ZERO_ADDRESS,
        player2: Utils.ZERO_ADDRESS,
        count: 0,
        turnNum: 0
      };

      const action = {
        actionType: ActionTypes.INCREMENT,
        byHowMuch: 1
      };

      const ret = await game.functions.applyAction(baseState, action);

      const data = ethers.utils.defaultAbiCoder.decode([stateEncoding], ret)[0];

      data.count.should.be.bignumber.eq(1);
      data.turnNum.should.be.bignumber.eq(1);
    });

    it("should work for decrement", async () => {
      const baseState = {
        player1: Utils.ZERO_ADDRESS,
        player2: Utils.ZERO_ADDRESS,
        count: 5,
        turnNum: 1
      };

      const action = {
        actionType: ActionTypes.DECREMENT,
        byHowMuch: 1
      };

      const ret = await game.functions.applyAction(baseState, action);

      const data = ethers.utils.defaultAbiCoder.decode([stateEncoding], ret)[0];

      data.count.should.be.bignumber.eq(4);
      data.turnNum.should.be.bignumber.eq(2);
    });

    it("should fail for unknown action", async () => {
      const baseState = {
        player1: Utils.ZERO_ADDRESS,
        player2: Utils.ZERO_ADDRESS,
        count: 0,
        turnNum: 0
      };

      const action = {
        actionType: 2,
        byHowMuch: 1
      };

      await Utils.assertRejects(game.functions.applyAction(baseState, action));
    });
  });
});
