import { legacy } from "@counterfactual/cf.js";
import { NetworkContext } from "@counterfactual/types";
import { ethers } from "ethers";

import {
  Context,
  InstructionExecutor,
  InstructionExecutorConfig
} from "../../src/instruction-executor";
import { Opcode } from "../../src/opcodes";
import { InternalMessage } from "../../src/types";

import { TestCommitmentStore } from "./test-commitment-store";
import { TestIOProvider } from "./test-io-provider";

const { AddressZero } = ethers.constants;

export class TestResponseSink implements legacy.node.ResponseSink {
  public instructionExecutor: InstructionExecutor;
  public io: TestIOProvider;
  public store: TestCommitmentStore;
  public signingKey: ethers.utils.SigningKey;

  public active: Boolean;

  // when TestResponseSink::run(.*)Protocol is called, the returned promise's
  // resolve function is captured and stored here
  private runProtocolContinuation?: (arg: legacy.node.Response) => void;

  constructor(readonly privateKey: string, networkContext: NetworkContext) {
    this.active = false;

    this.store = new TestCommitmentStore();

    this.signingKey = new ethers.utils.SigningKey(privateKey);

    if (networkContext === undefined) {
      console.warn(
        `Defaulting network context to ${
          ethers.constants.AddressZero
        } for all contracts.`
      );
    }

    // An instance of a InstructionExecutor that will execute protocols.
    this.instructionExecutor = new InstructionExecutor(
      new InstructionExecutorConfig(
        this,
        networkContext || {
          ETHBucket: AddressZero,
          StateChannelTransaction: AddressZero,
          MultiSend: AddressZero,
          NonceRegistry: AddressZero,
          AppRegistry: AddressZero,
          ETHBalanceRefund: AddressZero
        }
      )
    );

    this.io = new TestIOProvider(this);

    // TODO: Document why this is needed.
    // https://github.com/counterfactual/monorepo/issues/108
    this.io.ackMethod = this.instructionExecutor.dispatchReceivedMessage.bind(
      this.instructionExecutor
    );

    this.instructionExecutor.register(
      Opcode.OP_SIGN,
      (message, next, context) => {
        const signature = this.signMyUpdate(context);
        context.signature = signature;
      }
    );

    this.instructionExecutor.register(
      Opcode.OP_SIGN_VALIDATE,
      async (message: InternalMessage, next: Function, context: Context) => {
        return this.validateSignatures(message, next, context);
      }
    );

    this.instructionExecutor.register(
      Opcode.IO_SEND,
      this.io.ioSendMessage.bind(this.io)
    );

    this.instructionExecutor.register(
      Opcode.IO_WAIT,
      this.io.waitForIo.bind(this.io)
    );

    this.instructionExecutor.register(
      Opcode.STATE_TRANSITION_COMMIT,
      this.store.setCommitment.bind(this.store)
    );
  }

  public async runUninstallProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    peerAmounts: legacy.utils.PeerBalance[],
    appId: string
  ): Promise<legacy.node.Response> {
    this.active = true;
    this.instructionExecutor.runUninstallProtocol(
      fromAddress,
      toAddress,
      multisigAddress,
      peerAmounts,
      appId
    );
    return new Promise<legacy.node.Response>(resolve => {
      this.runProtocolContinuation = resolve;
    });
  }

  public async runUpdateProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    appId: string,
    encodedAppState: string,
    appStateHash: legacy.utils.H256
  ): Promise<legacy.node.Response> {
    this.active = true;
    const promise = new Promise<legacy.node.Response>((resolve, reject) => {
      this.runProtocolContinuation = resolve;
    });
    this.instructionExecutor.runUpdateProtocol(
      fromAddress,
      toAddress,
      multisigAddress,
      appId,
      encodedAppState,
      appStateHash
    );
    return promise;
  }

  public async runSetupProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string
  ): Promise<legacy.node.Response> {
    this.active = true;
    const promise = new Promise<legacy.node.Response>((resolve, reject) => {
      this.runProtocolContinuation = resolve;
    });
    this.instructionExecutor.runSetupProtocol(
      fromAddress,
      toAddress,
      multisigAddress
    );
    return promise;
  }

  public async runInstallMetachannelAppProtocol(
    fromAddress: string,
    toAddress: string,
    intermediary: string,
    multisigAddress: string
  ): Promise<legacy.node.Response> {
    this.active = true;
    const promise = new Promise<legacy.node.Response>((resolve, reject) => {
      this.runProtocolContinuation = resolve;
    });
    this.instructionExecutor.runInstallMetachannelAppProtocol(
      fromAddress,
      toAddress,
      intermediary,
      multisigAddress
    );
    return promise;
  }

  public runInstallProtocol(
    fromAddress: string,
    toAddress: string,
    multisigAddress: string,
    installData: legacy.app.InstallData
  ): Promise<legacy.node.Response> {
    this.active = true;
    const promise = new Promise<legacy.node.Response>((resolve, reject) => {
      this.runProtocolContinuation = resolve;
    });
    this.instructionExecutor.runInstallProtocol(
      fromAddress,
      toAddress,
      multisigAddress,
      installData
    );
    return promise;
  }

  /**
   * Resolves the registered promise so the test can continue.
   */
  public sendResponse(res: legacy.node.Response) {
    this.active = false;
    if (this.runProtocolContinuation) {
      this.runProtocolContinuation(res);
      this.runProtocolContinuation = undefined;
    }
  }

  /**
   * Called When a peer wants to send an io messge to this wallet.
   */
  public receiveMessageFromPeer(incoming: legacy.node.ClientActionMessage) {
    this.io.receiveMessageFromPeer(incoming);
  }

  private signMyUpdate(context: Context): ethers.utils.Signature {
    const operation = context.operation!;
    const digest = operation.hashToSign();
    const { recoveryParam, r, s } = this.signingKey.signDigest(digest);
    return { r, s, v: recoveryParam! + 27 };
  }

  private validateSignatures(
    message: InternalMessage,
    next: Function,
    context: Context
  ) {
    const operation = context.operation!;
    const digest = operation.hashToSign();
    let sig;
    const expectedSigningAddress =
      message.clientMessage.toAddress === this.signingKey.address
        ? message.clientMessage.fromAddress
        : message.clientMessage.toAddress;
    if (message.clientMessage.signature === undefined) {
      // initiator
      const incomingMessage = context.inbox[0];
      sig = incomingMessage.signature;
    } else {
      // receiver
      sig = message.clientMessage.signature;
    }

    const recoveredAddress = ethers.utils.recoverAddress(digest, {
      v: sig.v,
      r: sig.r,
      s: sig.s
    });
    if (recoveredAddress !== expectedSigningAddress) {
      // FIXME: handle this more gracefully
      // https://github.com/counterfactual/monorepo/issues/93
      throw Error("Invalid signature");
    }
  }
}
