import * as chai from "chai";

import * as ethers from "ethers";

import * as Utils from "@counterfactual/test-utils";

const Nim = artifacts.require("Nim");

const StaticCall = artifacts.require("StaticCall");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

contract("Nim", (accounts: string[]) => {
  let game: ethers.Contract;

  const stateEncoding =
    "tuple(address[2] players, uint256 turnNum, uint256[3] pileHeights)";

  beforeEach(async () => {
    const contract = new ethers.Contract("", Nim.abi, unlockedAccount);
    Nim.link("StaticCall", StaticCall.address);
    game = await contract.deploy(Nim.binary);
  });

  describe("reducer", () => {
    it("can take from a pile", async () => {
      const preState = {
        players: [Utils.zeroAddress, Utils.zeroAddress],
        turnNum: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 5
      };

      const ret = await game.functions.reducer(preState, action);

      const postState = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      postState.pileHeights[0].should.be.bignumber.eq(1);
      postState.pileHeights[1].should.be.bignumber.eq(5);
      postState.pileHeights[2].should.be.bignumber.eq(12);
      postState.turnNum.should.be.bignumber.eq(1);
    });

    it("should not fail for emptying pile", async () => {
      const preState = {
        players: [Utils.zeroAddress, Utils.zeroAddress],
        turnNum: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 6
      };

      await game.functions.reducer(preState, action);
    });

    it("should fail for taking too much", async () => {
      const preState = {
        players: [Utils.zeroAddress, Utils.zeroAddress],
        turnNum: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 7
      };

      await Utils.assertRejects(game.functions.reducer(preState, action));
    });
  });

  describe("isFinal", () => {
    it("empty state is final", async () => {
      const preState = {
        players: [Utils.zeroAddress, Utils.zeroAddress],
        turnNum: 49,
        pileHeights: [0, 0, 0]
      };
      const ret = await game.functions.isStateFinal(preState);
      chai.assert(ret);
    });

    it("nonempty state is not final", async () => {
      const preState = {
        players: [Utils.zeroAddress, Utils.zeroAddress],
        turnNum: 49,
        pileHeights: [0, 1, 0]
      };
      const ret = await game.functions.isStateFinal(preState);
      chai.assert(!ret);
    });
  });
});
