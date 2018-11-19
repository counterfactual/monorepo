import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";
import * as _ from "lodash";

import {
  Context,
  InstructionExecutor,
  InstructionExecutorConfig
} from "../../src/instruction-executor";
import { Opcode } from "../../src/instructions";
import { InternalMessage } from "../../src/types";
import {
  SimpleStringMapSyncDB,
  WriteAheadLog
} from "../../src/write-ahead-log";

import { TestCommitmentStore } from "./test-commitment-store";
import { TestIOProvider } from "./test-io-provider";

export class TestResponseSink implements cf.legacy.node.ResponseSink {
  public instructionExecutor: InstructionExecutor;
  public io: TestIOProvider;
  public writeAheadLog: WriteAheadLog;
  public store: TestCommitmentStore;
  public signingKey: ethers.utils.SigningKey;

  private requests: Map<string, Function>;
  private messageListener?: Function;

  constructor(
    readonly privateKey: string,
    networkContext?: cf.legacy.network.NetworkContext
  ) {
    // A mapping of requsts that are coming into the response sink.
    this.requests = new Map<string, Function>();
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
        networkContext || cf.legacy.network.EMPTY_NETWORK_CONTEXT
      )
    );

    this.writeAheadLog = new WriteAheadLog(
      new SimpleStringMapSyncDB(),
      this.signingKey.address
    );

    this.io = new TestIOProvider();

    // TODO: Document why this is needed.
    // https://github.com/counterfactual/monorepo/issues/108
    this.io.ackMethod = this.instructionExecutor.receiveClientActionMessageAck.bind(
      this.instructionExecutor
    );

    this.instructionExecutor.register(
      Opcode.ALL,
      async (message: InternalMessage, next: Function, context: Context) => {
        this.writeAheadLog.write(message, context);
      }
    );

    this.instructionExecutor.register(
      Opcode.OP_SIGN,
      (message, next, context) => {
        const signature = this.signMyUpdate(context);
        context.intermediateResults.signature = signature;
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

  /**
   * The test will call this when it wants to start a protocol.
   * Returns a promise that resolves with a Response object when
   * the protocol has completed execution.
   */
  public async runProtocol(
    msg: cf.legacy.node.ClientActionMessage
  ): Promise<cf.legacy.node.WalletResponse> {
    const promise = new Promise<cf.legacy.node.WalletResponse>((resolve, reject) => {
      this.requests[msg.requestId] = resolve;
    });
    this.instructionExecutor.receiveClientActionMessage(msg);
    return promise;
  }

  /**
   * Resolves the registered promise so the test can continue.
   */
  public sendResponse(res: cf.legacy.node.WalletResponse) {
    if ("requestId" in res && this.requests[res.requestId] !== undefined) {
      const promise = this.requests[res.requestId];
      delete this.requests[res.requestId];
      promise(res);
    } else {
      // FIXME: Understand better what this is supposed to do...
      // https://github.com/counterfactual/monorepo/issues/141
      // throw Error(`Response ${res.type} not found in ResponseSink requests`);
    }
  }

  /**
   * Called When a peer wants to send an io messge to this wallet.
   */
  public receiveMessageFromPeer(incoming: cf.legacy.node.ClientActionMessage) {
    this.io.receiveMessageFromPeer(incoming);
  }

  // TODO: Figure out which client to send the response to
  // https://github.com/counterfactual/monorepo/issues/106
  //
  // TODO: Refactor to clarify difference with sendMessageToClient
  // https://github.com/counterfactual/monorepo/issues/105
  public sendIoMessageToClient(message: cf.legacy.node.ClientActionMessage) {
    if (this.messageListener) {
      this.messageListener(message);
    }
  }

  // TODO: Make messageListener a map/array
  // https://github.com/counterfactual/monorepo/issues/147
  public onMessage(callback: Function) {
    this.messageListener = callback;
  }

  private signMyUpdate(
    context: Context
  ): ethers.utils.Signature {
    const operation = context.intermediateResults.operation!;
    const digest = operation.hashToSign();
    const { recoveryParam, r, s } = this.signingKey.signDigest(digest);
    return { r, s, v: recoveryParam! + 27 };
  }

  private validateSignatures(
    message: InternalMessage,
    next: Function,
    context: Context
  ) {
    const operation = context.intermediateResults.operation!;
    const digest = operation.hashToSign();
    let sig;
    const expectedSigningAddress =
      message.clientMessage.toAddress === this.signingKey.address
        ? message.clientMessage.fromAddress
        : message.clientMessage.toAddress;
    if (message.clientMessage.signature === undefined) {
      // initiator
      const incomingMessage = context.intermediateResults.inbox!;
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
