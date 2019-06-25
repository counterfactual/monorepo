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
    [`tuple(tuple(address to, uint256 amount)[] transfers, bool finalized)`],
    encodedAppState
  )[0];
}

describe("SimpleTwoPartySwapApp", () => {
  let simpleSwapApp: Contract;

  function encodeState(state: SimpleSwapAppState) {
    return defaultAbiCoder.encode(
      [`tuple(tuple(address to, uint256 amount)[] transfers, bool finalized)`],
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
      const tokenAmt = new BigNumber(10000);
      const ethAmt = new BigNumber(500);
      const tokenSwapAmt = new BigNumber(10);
      const ethSwapAmt = new BigNumber(20);
      const preState: SimpleSwapAppState = {
        coinBalances: [
          {
            to: senderAddr,
            coinAddress: [/*INSERT DOLPHIN COIN*/"0xtemp", AddressZero],
            balance: [tokenAmt, Zero],
          },
          {
            to: receiverAddr,
            coinAddress: [/*INSERT DOLPHIN COIN*/"0xtemp", AddressZero],
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

      expect(ret).to.eq(
        defaultAbiCoder.encode(
            ["tuple(address,uint256)[]"],
            [[[senderAddr, senderAmt], [receiverAddr, Zero]]]
        )
      );


//       state = decodeBytesToAppState(ret);
//       expect(state.transfers[0].amount).to.eq(
//         senderAmt.sub(transferAmt1).sub(transferAmt2)
//       );
//       expect(state.transfers[1].amount).to.eq(transferAmt1.add(transferAmt2));
//     });
//   });

//   it("can finalize the state with a 0 transfer", async () => {
//     const senderAddr = mkAddress("0xa");
//     const receiverAddr = mkAddress("0xb");
//     const senderAmt = new BigNumber(10000);
//     const preState: CoinTransferAppState = {
//       transfers: [
//         {
//           to: senderAddr,
//           amount: senderAmt
//         },
//         {
//           to: receiverAddr,
//           amount: Zero
//         }
//       ],
//       finalized: false
//     };

//     const action: ETHUnidirectionalTransferAppAction = {
//       transferAmount: Zero,
//       finalize: true
//     };

//     let ret = await applyAction(preState, action);
//     const state = decodeBytesToAppState(ret);
//     expect(state.finalized).to.be.true;

//     ret = await computeOutcome(state);

//     expect(ret).to.eq(
//       defaultAbiCoder.encode(
//         ["tuple(address,uint256)[]"],
//         [[[senderAddr, senderAmt], [receiverAddr, Zero]]]
//       )
//     );
  });
});
