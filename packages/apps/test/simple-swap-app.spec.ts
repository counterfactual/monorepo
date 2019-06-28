import { SolidityABIEncoderV2Type } from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { Zero, AddressZero } from "ethers/constants";
import { BigNumber, defaultAbiCoder } from "ethers/utils";

import SimpleTwoPartySwapApp from "../build/SimpleTwoPartySwapApp.json";

chai.use(waffle.solidity);

type CoinBalances = {
    to: string
    coinAddress: string[]
    balance: BigNumber[]
  }

type SimpleSwapAppState = {
  coinBalances: CoinBalances[];
  finalized: boolean;
};

const { expect } = chai;

function mkAddress(prefix: string = "0xa"): string {
  return prefix.padEnd(42, "0");
}

function decodeBytesToAppState(encodedAppState: string): SimpleSwapAppState {
  return defaultAbiCoder.decode(
    [`tuple(address to, address[] coinAddress, uint256[] balance)[] coinBalances`],
    encodedAppState
  )[0];
}

describe("SimpleTwoPartySwapApp", () => {
  let simpleSwapApp: Contract;

  function encodeState(state: SimpleSwapAppState) {
    return defaultAbiCoder.encode(
      [`tuple(tuple(address to, address[] coinAddress, uint256[] balance)[] coinBalances, bool finalized)`],
      [state]
    );
  }

  async function computeOutcome(state: SimpleSwapAppState) {
    return await simpleSwapApp.functions.computeOutcome(encodeState(state));
  }

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    simpleSwapApp = await waffle.deployContract(
      wallet,
      SimpleTwoPartySwapApp
    );
  });

  describe("update state", () => {
    it("can compute outcome with update", async () => {
      const senderAddr = mkAddress("0xa");
      const receiverAddr = mkAddress("0xb");
      const tokenAddr = mkAddress("0xc");
      const tokenAmt = new BigNumber(10000);
      const ethAmt = new BigNumber(500);
      const tokenSwapAmt = new BigNumber(10);
      const ethSwapAmt = new BigNumber(20);
      const preState: SimpleSwapAppState = {
        coinBalances: [
          {
            to: senderAddr,
            coinAddress: [tokenAddr, AddressZero],
            balance: [tokenAmt, Zero],
          },
          {
            to: receiverAddr,
            coinAddress: [tokenAddr, AddressZero],
            balance: [Zero, ethAmt],
          }
        ],
        finalized: false
      };

      let state = preState;

      state.coinBalances[0].balance = [tokenAmt.sub(tokenSwapAmt), Zero.add(ethSwapAmt)]
      state.coinBalances[1].balance = [Zero.add(tokenSwapAmt), ethAmt.sub(ethSwapAmt)]
      state.finalized = true;

      const ret = await computeOutcome(state);

      console.log(decodeBytesToAppState(ret))
      console.log(decodeBytesToAppState(defaultAbiCoder.encode(
        [`tuple(address to, address[] coinAddress, uint256[] balance)[] coinBalances`],
        [
          {
            to: senderAddr,
            coinAddress: [tokenAddr, AddressZero],
            balance: [tokenAmt.sub(tokenSwapAmt), Zero.add(ethSwapAmt)],
          },
          {
            to: receiverAddr,
            coinAddress: [tokenAddr, AddressZero],
            balance: [Zero.add(tokenSwapAmt), ethAmt.sub(ethSwapAmt)],
          }
        ]
      )))

      expect(ret).to.eq(
        defaultAbiCoder.encode(
          [`tuple(address to, address[] coinAddress, uint256[] balance)[] coinBalances`],
          [
            {
              to: senderAddr,
              coinAddress: [tokenAddr, AddressZero],
              balance: [tokenAmt.sub(tokenSwapAmt), Zero.add(ethSwapAmt)],
            },
            {
              to: receiverAddr,
              coinAddress: [tokenAddr, AddressZero],
              balance: [Zero.add(tokenSwapAmt), ethAmt.sub(ethSwapAmt)],
            }
          ]
        )
      );  
    });
  });
});
