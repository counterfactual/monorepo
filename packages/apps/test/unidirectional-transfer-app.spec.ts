import { SolidityValueType } from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { One, Zero } from "ethers/constants";
import {
  BigNumber,
  BigNumberish,
  defaultAbiCoder,
  getAddress
} from "ethers/utils";

import UnidirectionalTransferApp from "../expected-build-artifacts/UnidirectionalTransferApp.json";

const { expect } = chai.use(waffle.solidity);

type CoinTransfer = {
  to: string;
  amount: BigNumberish;
};

enum AppStage {
  POST_FUND,
  MONEY_SENT,
  CHANNEL_CLOSED
}

type UnidirectionalTransferAppState = {
  stage: AppStage;
  transfers: CoinTransfer[];
  turnNum: BigNumberish;
  finalized: boolean;
};

enum ActionType {
  SEND_MONEY,
  END_CHANNEL
}

type UnidirectionalTransferAppAction = {
  actionType: ActionType;
  amount: BigNumberish;
};

function mkAddress(prefix: string = "0xa"): string {
  return getAddress(prefix.padEnd(42, "0"));
}

const singleAssetTwoPartyCoinTransferEncoding = `
  tuple(address to, uint256 amount)[2]
`;

const unidirectionalTransferAppStateEncoding = `
  tuple(
    uint8 stage,
    ${singleAssetTwoPartyCoinTransferEncoding} transfers,
    uint256 turnNum,
    bool finalized
  )`;

const unidirectionalTransferAppActionEncoding = `
  tuple(
    uint8 actionType,
    uint256 amount
  )`;

const decodeAppState = (
  encodedAppState: string
): UnidirectionalTransferAppState =>
  defaultAbiCoder.decode(
    [unidirectionalTransferAppStateEncoding],
    encodedAppState
  )[0];

const encodeAppState = (state: SolidityValueType) =>
  defaultAbiCoder.encode([unidirectionalTransferAppStateEncoding], [state]);

const encodeAppAction = (state: SolidityValueType) =>
  defaultAbiCoder.encode([unidirectionalTransferAppActionEncoding], [state]);

describe("UnidirectionalTransferApp", () => {
  let unidirectionalTransferApp: Contract;

  const applyAction = (state: SolidityValueType, action: SolidityValueType) =>
    unidirectionalTransferApp.functions.applyAction(
      encodeAppState(state),
      encodeAppAction(action)
    );

  const computeOutcome = (state: SolidityValueType) =>
    unidirectionalTransferApp.functions.computeOutcome(encodeAppState(state));

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    unidirectionalTransferApp = await waffle.deployContract(
      wallet,
      UnidirectionalTransferApp
    );
  });

  describe("The applyAction function", async () => {
    const initialState: UnidirectionalTransferAppState = {
      stage: AppStage.POST_FUND,
      transfers: [
        { to: mkAddress("0xa"), amount: One.mul(2) },
        { to: mkAddress("0xb"), amount: Zero }
      ],
      turnNum: 0,
      finalized: false
    };

    describe("A valid SEND_MONEY action", async () => {
      let newState: UnidirectionalTransferAppState;

      before(async () => {
        const action: UnidirectionalTransferAppAction = {
          amount: One,
          actionType: ActionType.SEND_MONEY
        };

        newState = decodeAppState(await applyAction(initialState, action));
      });

      it("decrements the balance of the sender", async () => {
        const {
          transfers: [{ amount }]
        } = newState;
        expect(amount).to.eq(One);
      });

      it("increments the balance of the recipient", async () => {
        const {
          transfers: [{}, { amount }]
        } = newState;
        expect(amount).to.eq(One);
      });

      it("does not change the addresses of the participants", async () => {
        const {
          transfers: [{ to: to1 }, { to: to2 }]
        } = newState;
        expect(to1).to.eq(initialState.transfers[0].to);
        expect(to2).to.eq(initialState.transfers[1].to);
      });
    });

    it("reverts if the amount is larger than the sender's balance", async () => {
      const action: UnidirectionalTransferAppAction = {
        amount: One.mul(3),
        actionType: ActionType.SEND_MONEY
      };

      await expect(applyAction(initialState, action)).to.revertedWith(
        "SafeMath: subtraction overflow"
      );
    });

    it("reverts if given an invalid actionType", async () => {
      const action: UnidirectionalTransferAppAction = {
        amount: One,
        actionType: 2
      };

      await expect(applyAction(initialState, action)).to.reverted;
    });

    it("reverts if given a SEND_MONEY action from CHANNEL_CLOSED state", async () => {
      const action: UnidirectionalTransferAppAction = {
        amount: One.mul(3),
        actionType: ActionType.SEND_MONEY
      };

      await expect(
        applyAction({ ...initialState, stage: 2 }, action)
      ).to.revertedWith(
        // TODO: Note this error kind of makes no sense if you read it
        "Invalid action. Valid actions from MONEY_SENT are {END_CHANNEL}"
      );
    });

    it("can finalize the state by calling END_CHANNEL", async () => {
      const senderAddr = mkAddress("0xa");
      const receiverAddr = mkAddress("0xb");

      const senderAmt = new BigNumber(10000);

      const preState: UnidirectionalTransferAppState = {
        stage: AppStage.POST_FUND,
        transfers: [
          { to: senderAddr, amount: senderAmt },
          { to: receiverAddr, amount: Zero }
        ],
        turnNum: 0,
        finalized: false
      };

      const action: UnidirectionalTransferAppAction = {
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
});
