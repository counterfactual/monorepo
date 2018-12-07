import chai from "chai";
import * as waffle from "ethereum-waffle";
import { ethers } from "ethers";

import NimApp from "../build/NimApp.json";

chai.use(waffle.solidity);

const { expect } = chai;
const { AddressZero } = ethers.constants;

type NimAppState = {
  players: string[];
  turnNum: ethers.utils.BigNumber;
  pileHeights: ethers.utils.BigNumber[];
};

function decodeAppState(encodedAppState: string): NimAppState {
  return ethers.utils.defaultAbiCoder.decode(
    ["tuple(address[2] players, uint256 turnNum, uint256[3] pileHeights)"],
    encodedAppState
  )[0];
}

describe("Nim", () => {
  let nim: ethers.Contract;

  before(async () => {
    const provider: ethers.providers.Web3Provider = waffle.createMockProvider();
    const wallet: ethers.Wallet = (await waffle.getWallets(provider))[0];
    nim = await waffle.deployContract(wallet, NimApp);
  });

  describe("applyAction", () => {
    it("can take from a pile", async () => {
      const preState = {
        players: [AddressZero, AddressZero],
        turnNum: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 5
      };

      const ret = await nim.functions.applyAction(preState, action);

      const postState = decodeAppState(ret);

      expect(postState.pileHeights[0]).to.eq(1);
      expect(postState.pileHeights[1]).to.eq(5);
      expect(postState.pileHeights[2]).to.eq(12);
      expect(postState.turnNum).to.eq(1);
    });

    it("can take to produce an empty pile", async () => {
      const preState = {
        players: [AddressZero, AddressZero],
        turnNum: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 6
      };

      const ret = await nim.functions.applyAction(preState, action);

      const postState = decodeAppState(ret);

      expect(postState.pileHeights[0]).to.eq(0);
      expect(postState.pileHeights[1]).to.eq(5);
      expect(postState.pileHeights[2]).to.eq(12);
      expect(postState.turnNum).to.eq(1);
    });

    it("should fail for taking too much", async () => {
      const preState = {
        players: [AddressZero, AddressZero],
        turnNum: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 7
      };

      await expect(
        nim.functions.applyAction(preState, action)
        // @ts-ignore
      ).to.be.revertedWith("invalid pileIdx");
    });
  });

  describe("isFinal", () => {
    it("empty state is final", async () => {
      const preState = {
        players: [AddressZero, AddressZero],
        turnNum: 49,
        pileHeights: [0, 0, 0]
      };
      expect(await nim.functions.isStateTerminal(preState)).to.eq(true);
    });

    it("nonempty state is not final", async () => {
      const preState = {
        players: [AddressZero, AddressZero],
        turnNum: 49,
        pileHeights: [0, 1, 0]
      };
      expect(await nim.functions.isStateTerminal(preState)).to.eq(false);
    });
  });
});
