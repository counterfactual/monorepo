import { SolidityABIEncoderV2Type } from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { Zero } from "ethers/constants";
import { BigNumber, BigNumberish, defaultAbiCoder } from "ethers/utils";

import ETHUnidirectionalTransferApp from "../build/ETHUnidirectionalTransferApp.json";

const { expect } = chai.use(waffle.solidity);

type CoinTransfer = {
  to: string;
  amount: BigNumber;
};

enum AppStage {
  POST_FUND,
  MONEY_SENT,
  CHANNEL_CLOSED
}

type ETHUnidirectionalTransferAppState = {
  stage: AppStage;
  transfers: CoinTransfer[];
  turnNum: BigNumberish;
  finalized: boolean;
};

enum ActionType {
  SEND_MONEY,
  END_CHANNEL
}

type ETHUnidirectionalTransferAppAction = {
  actionType: ActionType;
  amount: BigNumber;
};

function mkAddress(prefix: string = "0xa"): string {
  return prefix.padEnd(42, "0");
}

const singleAssetTwoPartyCoinTransferEncoding = `
  tuple(address to, uint256 amount)[2]
`;

const ethUnidirectionalTransferAppStateEncoding = `
  tuple(
    uint8 stage,
    ${singleAssetTwoPartyCoinTransferEncoding} transfers,
    uint256 turnNum,
    bool finalized
  )`;

const ethUnidirectionalTransferAppActionEncoding = `
  tuple(
    uint8 actionType,
    uint256 amount
  )`;

const decodeAppState = (
  encodedAppState: string
): ETHUnidirectionalTransferAppState =>
  defaultAbiCoder.decode(
    [ethUnidirectionalTransferAppStateEncoding],
    encodedAppState
  )[0];

const encodeAppState = (state: SolidityABIEncoderV2Type) =>
  defaultAbiCoder.encode([ethUnidirectionalTransferAppStateEncoding], [state]);

const encodeAppAction = (state: SolidityABIEncoderV2Type) =>
  defaultAbiCoder.encode([ethUnidirectionalTransferAppActionEncoding], [state]);

describe("ETHUnidirectionalTransferApp", () => {
  let ethUnidirectionalTransferApp: Contract;

  const applyAction = (
    state: SolidityABIEncoderV2Type,
    action: SolidityABIEncoderV2Type
  ) =>
    ethUnidirectionalTransferApp.functions.applyAction(
      encodeAppState(state),
      encodeAppAction(action)
    );

  const computeOutcome = (state: SolidityABIEncoderV2Type) =>
    ethUnidirectionalTransferApp.functions.computeOutcome(
      encodeAppState(state)
    );

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    ethUnidirectionalTransferApp = await waffle.deployContract(
      wallet,
      ETHUnidirectionalTransferApp
    );
  });

  it("can make transfers", async () => {
    const senderAddr = mkAddress("0xa");
    const receiverAddr = mkAddress("0xb");

    const senderAmt = new BigNumber(10000);
    const amount = new BigNumber(10);

    const preState: ETHUnidirectionalTransferAppState = {
      stage: AppStage.POST_FUND,
      transfers: [
        { to: senderAddr, amount: senderAmt },
        { to: receiverAddr, amount: Zero }
      ],
      turnNum: 0,
      finalized: false
    };

    const action: ETHUnidirectionalTransferAppAction = {
      amount,
      actionType: ActionType.SEND_MONEY
    };

    const ret = await applyAction(preState, action);

    const state = decodeAppState(ret);

    expect(state.transfers[0].amount).to.eq(senderAmt.sub(amount));
    expect(state.transfers[1].amount).to.eq(amount);
  });

  it("can finalize the state by calling END_CHANNEL", async () => {
    const senderAddr = mkAddress("0xa");
    const receiverAddr = mkAddress("0xb");

    const senderAmt = new BigNumber(10000);

    const preState: ETHUnidirectionalTransferAppState = {
      stage: AppStage.POST_FUND,
      transfers: [
        { to: senderAddr, amount: senderAmt },
        { to: receiverAddr, amount: Zero }
      ],
      turnNum: 0,
      finalized: false
    };

    const action: ETHUnidirectionalTransferAppAction = {
      actionType: ActionType.END_CHANNEL,
      amount: Zero
    };

    let ret = await applyAction(preState, action);

    const state = decodeAppState(ret);

    expect(state.finalized).to.be.true;

    ret = await computeOutcome(state);

    expect(ret).to.eq(
      defaultAbiCoder.encode(
        [singleAssetTwoPartyCoinTransferEncoding],
        [[[senderAddr, senderAmt], [receiverAddr, Zero]]]
      )
    );
  });
});
