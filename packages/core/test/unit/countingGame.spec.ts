import * as ethers from "ethers";

import * as Utils from "../helpers/utils";

const StaticCall = artifacts.require("StaticCall");
const CountingGame = artifacts.require("CountingGame");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

CountingGame.link("StaticCall", StaticCall.address);

contract("ForceMoveGame", (accounts: string[]) => {
  let countingGame: ethers.Contract;

  beforeEach(async () => {
    countingGame = await Utils.deployContract(CountingGame, unlockedAccount);
  });

  describe("transition rules", async () => {
    it("allows a move where the count incremented", async () => {
      const ret = await countingGame.functions.validTransition(
        ethers.utils.defaultAbiCoder.encode(["tuple(uint8)"], [[0]]),
        ethers.utils.defaultAbiCoder.encode(["tuple(uint8)"], [[1]])
      );
      ret.should.be.equal(true);
    });

    it("disallows a move where the count decrements", async () => {
      const ret = await countingGame.functions.validTransition(
        ethers.utils.defaultAbiCoder.encode(["tuple(uint8)"], [[1]]),
        ethers.utils.defaultAbiCoder.encode(["tuple(uint8)"], [[0]])
      );
      ret.should.be.equal(false);
    });
  });
});
