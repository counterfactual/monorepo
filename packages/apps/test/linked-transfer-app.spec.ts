import { Address, SolidityValueType } from "@counterfactual/types";
import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { AddressZero, One, Zero } from "ethers/constants";
import {
  BigNumber,
  defaultAbiCoder,
  hexlify,
  randomBytes,
  solidityKeccak256
} from "ethers/utils";

import UnidirectionalLinkedTransferApp from "../build/UnidirectionalLinkedTransferApp.json";

chai.use(waffle.solidity);

const { expect } = chai;

type CoinTransfer = {
  to: string;
  amount: BigNumber;
};

enum AppStage {
  POST_FUND,
  PAYMENT_CLAIMED,
  CHANNEL_CLOSED
}

type UnidirectionalLinkedTransferAppState = {
  stage: AppStage;
  transfers: CoinTransfer[];
  linkedHash: string;
  turnNum: BigNumber;
  finalized: boolean;
};

type UnidirectionalLinkedTransferAppAction = {
  amount: BigNumber;
  assetId: Address;
  paymentId: string;
  preImage: string;
};

const singleAssetTwoPartyCoinTransferEncoding = `
  tuple(address to, uint256 amount)[2]
`;

const unidirectionalLinkedTransferAppStateEncoding = `
  tuple(
    uint8 stage,
    ${singleAssetTwoPartyCoinTransferEncoding} transfers,
    bytes32 linkedHash,
    uint256 turnNum,
    bool finalized
  )
`;

const unidirectionalLinkedTransferAppActionEncoding = `
  tuple(
    uint256 amount,
    address assetId,
    bytes32 paymentId,
    bytes32 preImage
  )
`;

function mkAddress(prefix: string = "0xa"): string {
  return prefix.padEnd(42, "0");
}

function decodeAppState(
  encodedAppState: string
): UnidirectionalLinkedTransferAppState {
  return defaultAbiCoder.decode(
    [unidirectionalLinkedTransferAppStateEncoding],
    encodedAppState
  )[0];
}

function encodeAppState(state: SolidityValueType): string {
  return defaultAbiCoder.encode(
    [unidirectionalLinkedTransferAppStateEncoding],
    [state]
  );
}

function encodeAppAction(state: SolidityValueType): string {
  return defaultAbiCoder.encode(
    [unidirectionalLinkedTransferAppActionEncoding],
    [state]
  );
}

function createLinkedHash(
  action: UnidirectionalLinkedTransferAppAction
): string {
  return solidityKeccak256(
    ["uint256", "address", "bytes32", "bytes32"],
    [action.amount, action.assetId, action.paymentId, action.preImage]
  );
}

function assertRedeemed(
  state: UnidirectionalLinkedTransferAppState,
  params: {
    senderAddr: string;
    redeemerAddr: string;
    linkedHash: string;
    amount: BigNumber;
    turnNum: BigNumber;
  },
  valid: boolean = true
): void {
  const { senderAddr, redeemerAddr, linkedHash, amount, turnNum } = params;
  // assert transfer addresses
  expect(state.transfers[0].to.toLowerCase()).to.eq(senderAddr.toLowerCase());
  expect(state.transfers[1].to.toLowerCase()).to.eq(redeemerAddr.toLowerCase());
  // assert hash
  expect(state.linkedHash).to.eq(linkedHash);
  // assert finalized
  expect(state.finalized).to.be.true;
  // assert turnNum increase
  expect(state.turnNum.toString()).to.eq(turnNum.toString());

  // if payment was rejected, the transfers should be 0d out
  if (!valid) {
    // assert stage
    expect(state.stage).to.eq(AppStage.CHANNEL_CLOSED);
    // assert transfer amounts
    expect(state.transfers[0].amount.toString()).to.eq(amount.toString()); // sender
    expect(state.transfers[1].amount.toString()).to.eq("0"); // redeemer
    return;
  }

  // otherwise, they should go through
  expect(state.stage).to.eq(AppStage.PAYMENT_CLAIMED);
  // assert transfer amounts
  expect(state.transfers[0].amount.toString()).to.eq("0"); // sender
  expect(state.transfers[1].amount.toString()).to.eq(amount.toString()); // redeemer
}

describe("LinkedUnidirectionalTransferApp", () => {
  let unidirectionalLinkedTransferApp: Contract;

  const applyAction = (
    state: SolidityValueType,
    action: SolidityValueType
  ): any =>
    unidirectionalLinkedTransferApp.functions.applyAction(
      encodeAppState(state),
      encodeAppAction(action)
    );

  const computeOutcome = (state: SolidityValueType): any =>
    unidirectionalLinkedTransferApp.functions.computeOutcome(
      encodeAppState(state)
    );

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = await waffle.getWallets(provider)[0];
    unidirectionalLinkedTransferApp = await waffle.deployContract(
      wallet,
      UnidirectionalLinkedTransferApp
    );
  });

  it("can redeem a payment with correct hash", async () => {
    const senderAddr = mkAddress("0xa"); // e.g node
    const redeemerAddr = mkAddress("0xb");

    const amount = new BigNumber(10);

    const paymentId = hexlify(randomBytes(32));
    const preImage = hexlify(randomBytes(32));

    const action: UnidirectionalLinkedTransferAppAction = {
      amount,
      paymentId,
      preImage,
      assetId: AddressZero
    };

    const linkedHash = createLinkedHash(action);

    /**
     * This is the initial state supplied to the `ProposeInstall`
     * function.
     */
    const prevState: UnidirectionalLinkedTransferAppState = {
      linkedHash,
      finalized: false,
      stage: AppStage.POST_FUND,
      transfers: [
        {
          amount,
          to: senderAddr
        },
        {
          amount: Zero,
          to: redeemerAddr
        }
      ],
      turnNum: Zero
    };

    const ret = await applyAction(prevState, action);

    const state = decodeAppState(ret);

    assertRedeemed(state, {
      senderAddr,
      redeemerAddr,
      linkedHash,
      amount,
      turnNum: One
    });

    // verify outcome
    const res = await computeOutcome(state);
    expect(res).to.eq(
      defaultAbiCoder.encode(
        [singleAssetTwoPartyCoinTransferEncoding],
        [[[senderAddr, Zero], [redeemerAddr, amount]]]
      )
    );
  });

  it("can revert the transfers if the provided secret is not correct", async () => {
    const senderAddr = mkAddress("0xa"); // e.g node
    const redeemerAddr = mkAddress("0xb");

    const amount = new BigNumber(10);

    const paymentId = hexlify(randomBytes(32));
    const preImage = hexlify(randomBytes(32));

    const action: UnidirectionalLinkedTransferAppAction = {
      amount,
      paymentId,
      preImage,
      assetId: AddressZero
    };

    const linkedHash = createLinkedHash(action);
    const suppliedAction: UnidirectionalLinkedTransferAppAction = {
      ...action,
      preImage: hexlify(randomBytes(32))
    };

    /**
     * This is the initial state supplied to the `ProposeInstall`
     * function.
     */
    const prevState: UnidirectionalLinkedTransferAppState = {
      linkedHash,
      finalized: false,
      stage: AppStage.POST_FUND,
      transfers: [
        {
          amount,
          to: senderAddr
        },
        {
          amount: Zero,
          to: redeemerAddr
        }
      ],
      turnNum: Zero
    };

    const ret = await applyAction(prevState, suppliedAction);

    const state = decodeAppState(ret);

    assertRedeemed(
      state,
      { senderAddr, redeemerAddr, linkedHash, amount, turnNum: One },
      false
    );

    // verify outcome
    const res = await computeOutcome(state);
    expect(res).to.eq(
      defaultAbiCoder.encode(
        [singleAssetTwoPartyCoinTransferEncoding],
        [[[senderAddr, amount], [redeemerAddr, Zero]]]
      )
    );
  });
});
