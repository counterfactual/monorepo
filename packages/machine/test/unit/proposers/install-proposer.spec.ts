import { legacy } from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { InstallProposer } from "../../../src/middleware/state-transition/install-proposer";
import { Node, StateChannelInfoImpl } from "../../../src/node";
import { Opcode } from "../../../src/opcodes";
import { InternalMessage } from "../../../src/types";

import {
  A_ADDRESS,
  B_ADDRESS,
  UNUSED_FUNDED_ACCOUNT
} from "../../test-helpers/environment";

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
  it("should propose a new install state", () => {
    const message = new InternalMessage(
      legacy.node.ActionName.INSTALL,
      Opcode.STATE_TRANSITION_PROPOSE,
      installClientMsg()
    );
    const expectedCfAddr = new legacy.app.AppInstance(
      message.clientMessage.multisigAddress,
      [KEY_A, KEY_B],
      message.clientMessage.data.app,
      message.clientMessage.data.terms,
      message.clientMessage.data.timeout,
      1
    ).cfAddress();
    const proposal = InstallProposer.propose(
      message,
      {
        intermediateResults: {
          inbox: [],
          outbox: []
        },
        instructionExecutor: Object.create(null)
      },
      setupInstallState()
    );
    validateInstallInfos(proposal.state, expectedCfAddr);
  });
});

function setupInstallState(): Node {
  const freeBalance = new legacy.utils.FreeBalance(
    A_ADDRESS,
    ethers.utils.bigNumberify(20),
    B_ADDRESS,
    ethers.utils.bigNumberify(20),
    0, // local nonce
    0, // uniqueId
    100, // timeout
    new legacy.utils.Nonce(true, 0, 0) // nonce
  );
  const info = new StateChannelInfoImpl(
    B_ADDRESS,
    A_ADDRESS,
    UNUSED_FUNDED_ACCOUNT,
    {},
    freeBalance
  );
  const channelStates: legacy.channel.StateChannelInfos = {
    [UNUSED_FUNDED_ACCOUNT]: info
  };
  return new Node(channelStates, {});
}

function installClientMsg(): legacy.node.ClientActionMessage {
  return {
    appInstanceId: "0",
    action: legacy.node.ActionName.INSTALL,
    data: {
      peerA: new legacy.utils.PeerBalance(A_ADDRESS, 5),
      peerB: new legacy.utils.PeerBalance(B_ADDRESS, 3),
      keyA: KEY_A,
      keyB: KEY_B,
      encodedAppState: "0x0",
      terms: new legacy.app.Terms(
        0,
        ethers.utils.bigNumberify(8),
        TOKEN_ADDRESS
      ),
      app: new legacy.app.AppInterface(
        APP_ADDRESS,
        APPLY_ACTION,
        RESOLVE,
        TURN,
        IS_STATE_TERMINAL,
        ABI_ENCODING
      ),
      timeout: 100
    },
    multisigAddress: UNUSED_FUNDED_ACCOUNT,
    fromAddress: B_ADDRESS,
    toAddress: A_ADDRESS,
    seq: 0
  };
}

function validateInstallInfos(
  infos: legacy.channel.StateChannelInfos,
  expectedCfAddr: legacy.utils.H256
) {
  const stateChannel = infos[UNUSED_FUNDED_ACCOUNT];

  expect(stateChannel.freeBalance.aliceBalance.toNumber()).toEqual(15);
  expect(stateChannel.freeBalance.bobBalance.toNumber()).toEqual(17);

  const app = infos[UNUSED_FUNDED_ACCOUNT].appInstances[expectedCfAddr];
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
  expect(app.dependencyNonce.nonceValue).toEqual(0);
}
