import {
  SolidityABIEncoderV2Type,
  TwoPartyOutcome
} from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { HashZero } from "ethers/constants";
import { defaultAbiCoder, solidityKeccak256, BigNumber } from "ethers/utils";

import EthPaymentApp from "../build/EthPaymentApp.json";

chai.use(waffle.solidity);

type EthTransfer = {
  
}

type EthPaymentAppState = {

}

const { expect } = chai;

function decodeBytesToAppState(encodedAppState: string): HighRollerAppState {
  return defaultAbiCoder.decode(
    [
      `tuple(
        uint8 stage,
        bytes32 salt,
        bytes32 commitHash,
        uint256 playerFirstNumber,
        uint256 playerSecondNumber
      )`
    ],
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
});
