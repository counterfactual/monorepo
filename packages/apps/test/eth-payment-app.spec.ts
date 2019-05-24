import { SolidityABIEncoderV2Type } from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { Zero } from "ethers/constants";
import { BigNumber, defaultAbiCoder } from "ethers/utils";

import EthPaymentApp from "../build/EthPaymentApp.json";

chai.use(waffle.solidity);

type EthTransfer = {
  to: string;
  amount: BigNumber;
};

type EthPaymentAppState = {
  transfers: EthTransfer[];
};

type Action = {
  paymentAmount: BigNumber;
};

const { expect } = chai;

function mkAddress(prefix: string = "0xa"): string {
  return prefix.padEnd(42, "0");
}

function decodeBytesToAppState(encodedAppState: string): EthPaymentAppState {
  return defaultAbiCoder.decode(
    [`tuple(tuple(address to, uint256 amount)[2] transfers)`],
    encodedAppState
  )[0];
}

describe("EthPaymentApp", () => {
  let ethPaymentApp: Contract;

  function encodeState(state: SolidityABIEncoderV2Type) {
    return defaultAbiCoder.encode(
      [`tuple(tuple(address to, uint256 amount)[2] transfers)`],
      [state]
    );
  }

  function encodeAction(state: SolidityABIEncoderV2Type) {
    return defaultAbiCoder.encode([`tuple(uint256 paymentAmount)`], [state]);
  }

  async function applyAction(
    state: SolidityABIEncoderV2Type,
    action: SolidityABIEncoderV2Type
  ) {
    return await ethPaymentApp.functions.applyAction(
      encodeState(state),
      encodeAction(action)
    );
  }

  async function computeOutcome(state: SolidityABIEncoderV2Type) {
    const [decodedResult] = defaultAbiCoder.decode(
      ["uint256"],
      await ethPaymentApp.functions.computeOutcome(encodeState(state))
    );
    console.log("decodedResult: ", decodedResult);
    return decodedResult;
  }

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    ethPaymentApp = await waffle.deployContract(wallet, EthPaymentApp);
  });

  describe("applyAction", () => {
    it("can make payments", async () => {
      const senderAddr = mkAddress("0xa");
      const receiverAddr = mkAddress("0xb");
      const senderAmt = new BigNumber(10000);
      const paymentAmt1 = new BigNumber(10);
      const paymentAmt2 = new BigNumber(20);
      const preState: EthPaymentAppState = {
        transfers: [
          {
            to: senderAddr,
            amount: senderAmt
          },
          {
            to: receiverAddr,
            amount: Zero
          }
        ]
      };

      let action: Action = {
        paymentAmount: paymentAmt1
      };
      let ret = await applyAction(preState, action);

      let state = decodeBytesToAppState(ret);
      expect(state.transfers[0].amount).to.eq(senderAmt.sub(paymentAmt1));
      expect(state.transfers[1].amount).to.eq(paymentAmt1);

      action = {
        paymentAmount: paymentAmt2
      };
      ret = await applyAction(state, action);

      state = decodeBytesToAppState(ret);
      expect(state.transfers[0].amount).to.eq(
        senderAmt.sub(paymentAmt1).sub(paymentAmt2)
      );
      expect(state.transfers[1].amount).to.eq(paymentAmt1.add(paymentAmt2));
    });

    it("can compute the outcome", async () => {
      const senderAddr = mkAddress("0xa");
      const receiverAddr = mkAddress("0xb");
      const senderAmt = new BigNumber(10000);
      const preState: EthPaymentAppState = {
        transfers: [
          {
            to: senderAddr,
            amount: senderAmt
          },
          {
            to: receiverAddr,
            amount: Zero
          }
        ]
      };

      expect(await computeOutcome(preState)).to.eq(OutcomeType.ETH_TRANSFER);
    });
  });
});
