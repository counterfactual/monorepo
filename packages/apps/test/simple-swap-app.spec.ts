import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { BigNumber, defaultAbiCoder } from "ethers/utils";

import SimpleTwoPartySwapApp from "../expected-build-artifacts/SimpleTwoPartySwapApp.json";

chai.use(waffle.solidity);

type CoinTransfer = {
  to: string;
  amount: BigNumber;
};

type SimpleSwapAppState = {
  coinTransfers: CoinTransfer[][];
};

const { expect } = chai;

function mkAddress(prefix: string = "0xa"): string {
  return prefix.padEnd(42, "0");
}

describe("SimpleTwoPartySwapApp", () => {
  let simpleSwapApp: Contract;

  function encodeState(state: SimpleSwapAppState) {
    return defaultAbiCoder.encode(
      [
        `tuple(
          tuple(
            address to,
            uint256 amount
          )[][] coinTransfers
        )`
      ],
      [state]
    );
  }

  async function computeOutcome(state: SimpleSwapAppState) {
    return await simpleSwapApp.functions.computeOutcome(encodeState(state));
  }

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    simpleSwapApp = await waffle.deployContract(wallet, SimpleTwoPartySwapApp);
  });

  describe("update state", () => {
    it("can compute outcome with update", async () => {
      const senderAddr = mkAddress("0xa");
      const receiverAddr = mkAddress("0xB");

      const tokenAmt = new BigNumber(10000);
      const ethAmt = new BigNumber(500);

      const preState: SimpleSwapAppState = {
        coinTransfers: [
          [
            {
              to: senderAddr,
              amount: tokenAmt
            }
          ],
          [
            {
              to: receiverAddr,
              amount: ethAmt
            }
          ]
        ]
      };

      const state: SimpleSwapAppState = {
        coinTransfers: [
          [
            {
              to: senderAddr,
              amount: ethAmt
            }
          ],
          [
            {
              to: receiverAddr,
              amount: tokenAmt
            }
          ]
        ]
      };

      const ret = await computeOutcome(preState);

      expect(ret).to.eq(
        defaultAbiCoder.encode(
          [`tuple(address to, uint256 amount)[][]`],
          [state.coinTransfers]
        )
      );
    });
  });
});
