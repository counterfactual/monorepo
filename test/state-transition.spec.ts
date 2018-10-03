import * as ethers from "ethers";

import { Instruction } from "../src/instructions";
import {
  CfAppInterface,
  CfFreeBalance,
  CfNonce,
  CfStateChannel,
  Terms
} from "../src/middleware/cf-operation/types";
import { InstallProposer } from "../src/middleware/state-transition/install-proposer";
import { SetupProposer } from "../src/middleware/state-transition/setup-proposer";
import { CfState, Context, StateChannelInfoImpl } from "../src/state";
import {
  ActionName,
  ChannelStates,
  ClientActionMessage,
  H256,
  InternalMessage,
  PeerBalance,
  StateChannelInfos
} from "../src/types";

import { A_ADDRESS, B_ADDRESS, MULTISIG_ADDRESS } from "./environment";
import { TestWallet } from "./wallet/wallet";

// install params
const KEY_A = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd3";
const KEY_B = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd4";
const TOKEN_ADDRESS = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd5";
const APP_ADDRESS = "0x9e5d9691ad19e3b8c48cb9b531465ffa73ee8dd6";
const APPLY_ACTION = "0x00000001";
const RESOLVE = "0x00000002";
const TURN = "0x00000003";
const IS_STATE_TERMINAL = "0x00000004";
const ABI_ENCODING = "";

describe("State transition", () => {
  it("should propose a new setup state", () => {
    const message = new InternalMessage(
      ActionName.SETUP,
      Instruction.STATE_TRANSITION_PROPOSE,
      setupClientMsg(),
      false
    );
    const proposal = SetupProposer.propose(message);
    validateSetupInfos(proposal.state);
  });
  it("should propose a new install state", () => {
    const message = new InternalMessage(
      ActionName.INSTALL,
      Instruction.STATE_TRANSITION_PROPOSE,
      installClientMsg(),
      false
    );
    const expectedCfAddr = new CfStateChannel(
      TestWallet.testNetwork(),
      message.clientMessage.multisigAddress,
      [KEY_A, KEY_B],
      message.clientMessage.data.app,
      message.clientMessage.data.terms,
      message.clientMessage.data.timeout,
      1
    ).cfAddress();
    const proposal = InstallProposer.propose(
      message,
      new Context(),
      setupInstallCfState()
    );
    validateInstallInfos(proposal.state, expectedCfAddr);
  });
});

function setupClientMsg(): ClientActionMessage {
  return {
    requestId: "0",
    appId: "0",
    action: ActionName.SETUP,
    data: {},
    multisigAddress: MULTISIG_ADDRESS,
    fromAddress: A_ADDRESS,
    toAddress: B_ADDRESS,
    stateChannel: undefined,
    seq: 0
  };
}

function setupInstallCfState(): CfState {
  const freeBalance = new CfFreeBalance(
    A_ADDRESS,
    ethers.utils.bigNumberify(20),
    B_ADDRESS,
    ethers.utils.bigNumberify(20),
    0, // local nonce
    0, // uniqueId
    100, // timeout
    new CfNonce(0, 0) // nonce
  );
  const info = new StateChannelInfoImpl(
    B_ADDRESS,
    A_ADDRESS,
    MULTISIG_ADDRESS,
    {},
    freeBalance
  );
  const channelStates: ChannelStates = { [MULTISIG_ADDRESS]: info };
  return new CfState(channelStates, TestWallet.testNetwork());
}

function validateSetupInfos(infos: StateChannelInfos) {
  expect(Object.keys(infos).length).toEqual(1);
  const info = infos[MULTISIG_ADDRESS];
  expect(info.counterParty).toEqual(B_ADDRESS);
  expect(info.me).toEqual(A_ADDRESS);
  expect(Object.keys(info.appChannels).length).toEqual(0);
  expect(info.freeBalance.alice).toEqual(A_ADDRESS);
  expect(info.freeBalance.aliceBalance.toNumber()).toEqual(0);
  expect(info.freeBalance.bob).toEqual(B_ADDRESS);
  expect(info.freeBalance.bobBalance.toNumber()).toEqual(0);
  expect(info.freeBalance.localNonce).toEqual(0);
  expect(info.freeBalance.uniqueId).toEqual(0);

  const expectedSalt = ethers.utils.solidityKeccak256(["uint256"], [0]);

  expect(info.freeBalance.nonce.nonceValue).toEqual(1);
  expect(info.freeBalance.nonce.salt).toEqual(expectedSalt);
}

function installClientMsg(): ClientActionMessage {
  return {
    requestId: "0",
    appId: "0",
    action: ActionName.INSTALL,
    data: {
      peerA: new PeerBalance(A_ADDRESS, 5),
      peerB: new PeerBalance(B_ADDRESS, 3),
      keyA: KEY_A,
      keyB: KEY_B,
      encodedAppState: "0x0",
      terms: new Terms(0, ethers.utils.bigNumberify(8), TOKEN_ADDRESS),
      app: new CfAppInterface(
        APP_ADDRESS,
        APPLY_ACTION,
        RESOLVE,
        TURN,
        IS_STATE_TERMINAL,
        ABI_ENCODING
      ),
      timeout: 100
    },
    multisigAddress: MULTISIG_ADDRESS,
    fromAddress: B_ADDRESS,
    toAddress: A_ADDRESS,
    stateChannel: undefined,
    seq: 0
  };
}

function validateInstallInfos(infos: StateChannelInfos, expectedCfAddr: H256) {
  const stateChannel = infos[MULTISIG_ADDRESS];

  expect(stateChannel.freeBalance.aliceBalance.toNumber()).toEqual(15);
  expect(stateChannel.freeBalance.bobBalance.toNumber()).toEqual(17);

  const app = infos[MULTISIG_ADDRESS].appChannels[expectedCfAddr];
  const expectedSalt =
    "0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6";

  expect(app.id).toEqual(expectedCfAddr);
  expect(app.peerA.address).toEqual(A_ADDRESS);
  expect(app.peerA.balance.toNumber()).toEqual(5);
  expect(app.peerB.address).toEqual(B_ADDRESS);
  expect(app.keyA).toEqual(KEY_A);
  expect(app.keyB).toEqual(KEY_B);
  expect(app.encodedState).toEqual("0x0");
  expect(app.localNonce).toEqual(1);
  expect(app.timeout).toEqual(100);
  expect(app.terms.assetType).toEqual(0);
  expect(app.terms.limit).toEqual(ethers.utils.bigNumberify(8));
  expect(app.terms.token).toEqual(TOKEN_ADDRESS);
  expect(app.cfApp.address).toEqual(APP_ADDRESS);
  expect(app.cfApp.applyAction).toEqual(APPLY_ACTION);
  expect(app.cfApp.resolve).toEqual(RESOLVE);
  expect(app.cfApp.getTurnTaker).toEqual(TURN);
  expect(app.cfApp.isStateTerminal).toEqual(IS_STATE_TERMINAL);
  expect(app.dependencyNonce.salt).toEqual(expectedSalt);
  expect(app.dependencyNonce.nonceValue).toEqual(1);
}
