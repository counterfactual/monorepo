import { SolidityValueType } from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { BigNumber, defaultAbiCoder } from "ethers/utils";

import NimApp from "../expected-build-artifacts/NimApp.json";

chai.use(waffle.solidity);

const { expect } = chai;

type NimAppState = {
  versionNumber: BigNumber;
  pileHeights: BigNumber[];
};

function decodeBytesToAppState(encodedAppState: string): NimAppState {
  return defaultAbiCoder.decode(
    ["tuple(uint256 versionNumber, uint256[3] pileHeights)"],
    encodedAppState
  )[0];
}

describe("Nim", () => {
  let nim: Contract;

  function encodeState(state: SolidityValueType) {
    return defaultAbiCoder.encode(
      [
        `
        tuple(
          uint256 versionNumber,
          uint256[3] pileHeights
        )
      `
      ],
      [state]
    );
  }

  function encodeAction(state: SolidityValueType) {
    return defaultAbiCoder.encode(
      [
        `
        tuple(
          uint256 pileIdx,
          uint256 takeAmnt
        )
      `
      ],
      [state]
    );
  }

  async function applyAction(
    state: SolidityValueType,
    action: SolidityValueType
  ) {
    return await nim.functions.applyAction(
      encodeState(state),
      encodeAction(action)
    );
  }

  async function isStateTerminal(state: SolidityValueType) {
    return await nim.functions.isStateTerminal(encodeState(state));
  }

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    nim = await waffle.deployContract(wallet, NimApp);
  });

  describe("applyAction", () => {
    it("can take from a pile", async () => {
      const preState = {
        versionNumber: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 5
      };

      const ret = await applyAction(preState, action);

      const postState = decodeBytesToAppState(ret);

      expect(postState.pileHeights[0]).to.eq(1);
      expect(postState.pileHeights[1]).to.eq(5);
      expect(postState.pileHeights[2]).to.eq(12);
      expect(postState.versionNumber).to.eq(1);
    });

    it("can take to produce an empty pile", async () => {
      const preState = {
        versionNumber: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 6
      };

      const ret = await applyAction(preState, action);

      const postState = decodeBytesToAppState(ret);

      expect(postState.pileHeights[0]).to.eq(0);
      expect(postState.pileHeights[1]).to.eq(5);
      expect(postState.pileHeights[2]).to.eq(12);
      expect(postState.versionNumber).to.eq(1);
    });

    it("should fail for taking too much", async () => {
      const preState = {
        versionNumber: 0,
        pileHeights: [6, 5, 12]
      };

      const action = {
        pileIdx: 0,
        takeAmnt: 7
      };

      await expect(applyAction(preState, action)).to.be.revertedWith(
        "invalid pileIdx"
      );
    });
  });

  describe("isFinal", () => {
    it("empty state is final", async () => {
      const preState = {
        versionNumber: 49,
        pileHeights: [0, 0, 0]
      };
      expect(await isStateTerminal(preState)).to.eq(true);
    });

    it("nonempty state is not final", async () => {
      const preState = {
        versionNumber: 49,
        pileHeights: [0, 1, 0]
      };
      expect(await isStateTerminal(preState)).to.eq(false);
    });
  });
});
