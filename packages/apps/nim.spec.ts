import { ethers } from "ethers";

import { AbstractContract, expect } from "../../utils";
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

contract("Nim", (accounts: string[]) => {
  let game: ethers.Contract;

  const stateEncoding =
    "tuple(address[2] players, uint256 turnNum, uint256[3] pileHeights)";

  beforeEach(async () => {
    const nim = await AbstractContract.fromArtifactName("NimApp");
    game = await nim.deploy(unlockedAccount);
  });

  describe("applyAction", () => {
    it("can take from a pile", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 5
      };

      const ret = await game.functions.applyAction(preState, action);

      const postState = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      expect(postState.pileHeights[0]).to.be.eql(new ethers.utils.BigNumber(1));
      expect(postState.pileHeights[1]).to.be.eql(new ethers.utils.BigNumber(5));
      expect(postState.pileHeights[2]).to.be.eql(
        new ethers.utils.BigNumber(12)
      );
      expect(postState.turnNum).to.be.eql(new ethers.utils.BigNumber(1));
    });

    it("can take to produce an empty pile", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 6
      };

      const ret = await game.functions.applyAction(preState, action);

      const postState = ethers.utils.defaultAbiCoder.decode(
        [stateEncoding],
        ret
      )[0];

      expect(postState.pileHeights[0]).to.be.eql(new ethers.utils.BigNumber(0));
      expect(postState.pileHeights[1]).to.be.eql(new ethers.utils.BigNumber(5));
      expect(postState.pileHeights[2]).to.be.eql(
        new ethers.utils.BigNumber(12)
      );
      expect(postState.turnNum).to.be.eql(new ethers.utils.BigNumber(1));
    });

    it("should fail for taking too much", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 7
      };

      await Utils.assertRejects(game.functions.applyAction(preState, action));
    });
  });

  describe("isFinal", () => {
    it("empty state is final", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 49,
        pileHeights: [0, 0, 0]
      };
      const ret = await game.functions.isStateTerminal(preState);
      expect(ret).to.be.eql(true);
    });

    it("nonempty state is not final", async () => {
      const preState = {
        players: [ethers.constants.AddressZero, ethers.constants.AddressZero],
        turnNum: 49,
        pileHeights: [0, 1, 0]
      };
      const ret = await game.functions.isStateTerminal(preState);
      expect(ret).to.be.eql(false);
    });
  });
});
