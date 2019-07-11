import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { AddressZero, Zero } from "ethers/constants";
import { BigNumber, defaultAbiCoder } from "ethers/utils";

import SimpleTwoPartySwapApp from "../build/SimpleTwoPartySwapApp.json";

chai.use(waffle.solidity);

type MultiCoinTransfer = {
  to: string;
  tokenAddresses: string[];
  amounts: BigNumber[];
};

type SimpleSwapAppState = {
  multiCoinTransfers: MultiCoinTransfer[];
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
            address[] tokenAddresses,
            uint256[] amounts
          )[] multiCoinTransfers
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
      const tokenAddr = mkAddress("0xC");
      const tokenAmt = new BigNumber(10000);
      const ethAmt = new BigNumber(500);
      const preState: SimpleSwapAppState = {
        multiCoinTransfers: [
          {
            to: senderAddr,
            tokenAddresses: [tokenAddr, AddressZero],
            amounts: [tokenAmt, Zero]
          },
          {
            to: receiverAddr,
            tokenAddresses: [tokenAddr, AddressZero],
            amounts: [Zero, ethAmt]
          }
        ]
      };

      const state: SimpleSwapAppState = {
        multiCoinTransfers: [
          {
            to: senderAddr,
            tokenAddresses: [tokenAddr, AddressZero],
            amounts: [Zero, ethAmt]
          },
          {
            to: receiverAddr,
            tokenAddresses: [tokenAddr, AddressZero],
            amounts: [tokenAmt, Zero]
          }
        ]
      };

      const ret = await computeOutcome(preState);
      expect(ret).to.eq(
        defaultAbiCoder.encode(
          [`tuple(address to, address[] tokenAddresses, uint256[] amounts)[]`],
          [state.multiCoinTransfers]
        )
      );
    });
  });
});
