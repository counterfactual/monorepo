import * as cf from "@counterfactual/cf.js";
import * as machine from "@counterfactual/machine";
import { StateProposal } from "@counterfactual/machine/dist/src/types";
import { ethers } from "ethers";

import { CommitmentStore } from "../commitmentStore";

import { IframeIoProvider } from "./ioProvider";
import { IFrameWallet } from "./wallet";

export let ganacheURL;

try {
  ganacheURL = process.env.GANACHE_URL || "http://localhost:9545";
  console.info(`Using the specified blockchain URL: ${ganacheURL}`);
} catch (e) {
  ganacheURL = "http://localhost:9545";
  console.info(`No blockchain URL specified. Defaulting to ${ganacheURL}`);
}

export class User
  implements machine.mixins.Observable, cf.legacy.node.ResponseSink {
  get isCurrentUser(): boolean {
    return this.wallet.currentUser === this;
  }
  public signingKey: ethers.utils.SigningKey;
  public ethersWallet: ethers.Wallet | ethers.providers.JsonRpcSigner;
  public instructionExecutor: machine.instructionExecutor.InstructionExecutor;
  public io: IframeIoProvider;
  public address: string;
  public store: CommitmentStore;

  /**
   * The write ahead log is used to keep track of protocol executions.
   * Specifically, whenever an instruction in a protocol is executed,
   * we write to the log so that, if the machine crashes, we can resume
   * by reading the last log entry and starting where the protocol left off.
   */
  public wal: machine.writeAheadLog.WriteAheadLog;

  // Observable
  public observers: Map<
    machine.mixins.NotificationType,
    Function[]
  > = new Map();
  private observerCallbacks: Map<string, Function> = new Map<
    string,
    Function
  >();

  constructor(
    readonly wallet: IFrameWallet,
    address: string,
    privateKey: string,
    networkContext: cf.legacy.network.NetworkContext,
    db?: machine.writeAheadLog.SyncDb,
    states?: cf.legacy.channel.StateChannelInfos
  ) {
    this.wallet = wallet;
    this.address = address;
    this.io = new IframeIoProvider(this);
    this.instructionExecutor = new machine.instructionExecutor.InstructionExecutor(
      new machine.instructionExecutor.InstructionExecutorConfig(
        this,
        networkContext,
        states
      )
    );
    this.wal = new machine.writeAheadLog.WriteAheadLog(
      db !== undefined ? db : new machine.writeAheadLog.SimpleStringMapSyncDB(),
      this.address
    );
    this.store = new CommitmentStore();
    this.io.ackMethod = this.instructionExecutor.receiveClientActionMessageAck.bind(
      this.instructionExecutor
    );
    this.registerMiddlewares();
    this.instructionExecutor.registerObserver(
      "actionCompleted",
      this.handleActionCompletion.bind(this)
    );

    this.signingKey = new ethers.utils.SigningKey(privateKey);
    this.address = this.signingKey.address;
    this.ethersWallet = this.generateEthersWallet(privateKey);
    this.initializeWallet(privateKey);
  }
  public registerObserver(
    type: machine.mixins.NotificationType,
    callback: Function
  ) {}
  public unregisterObserver(
    type: machine.mixins.NotificationType,
    callback: Function
  ) {}
  public notifyObservers(type: machine.mixins.NotificationType, data: object) {}

  public async deposit(options) {
    await this.ethersWallet.sendTransaction({
      to: options.multisig,
      value: options.value
    });
  }

  private async initializeWallet(privateKey) {
    const { web3 } = window as any;

    this.ethersWallet = web3
      ? await this.generateJsonRpcSigner(web3, privateKey)
      : this.generateEthersWallet(privateKey);
  }

  private async generateJsonRpcSigner(
    web3,
    privateKey
  ): Promise<ethers.Wallet | ethers.providers.JsonRpcSigner> {
    const provider = new ethers.providers.Web3Provider(web3.currentProvider);
    const ethersWallet = provider.getSigner();
    const accounts = await ethersWallet.provider.listAccounts();

    // TODO: handle when metamask client isn't signed in;
    // currently just defaulting to an ethers wallet
    return accounts.length > 0
      ? ethersWallet
      : this.generateEthersWallet(privateKey);
  }

  private generateEthersWallet(privateKey): ethers.Wallet {
    return new ethers.Wallet(
      privateKey,
      new ethers.providers.JsonRpcProvider(ganacheURL)
    );
  }

  // Load the previously saved data if any, and continue executing protocols
  public async init() {
    const savedLog = this.wal.readLog();
    if (Object.keys(savedLog).length === 0) {
      console.info("WAL is empty. Starting machine from clean state.");
    } else {
      console.info("WAL is not empty. Starting machine from persisted state.");
    }

    await this.instructionExecutor.resume(savedLog);
  }

  public handleActionCompletion(notification: cf.legacy.node.Notification) {
    this.notifyObservers(`${notification.data.name}Completed`, {
      requestId: notification.data.requestId,
      result: this.generateObserverNotification(notification),
      clientMessage: notification.data.clientMessage
    });
  }

  public generateObserverNotification(
    notification: cf.legacy.node.Notification
  ): StateProposal | undefined {
    return notification.data.proposedStateTransition;
  }

  public addObserver(message: cf.legacy.node.ClientActionMessage) {
    const boundNotification = this.sendNotification.bind(
      this,
      message.data.notificationType
    );
    this.observerCallbacks.set(message.data.observerId, boundNotification);
    this.registerObserver(message.data.notificationType, boundNotification);
  }

  public removeObserver(message: cf.legacy.node.ClientActionMessage) {
    const callback = this.observerCallbacks.get(message.data.observerId);

    if (callback) {
      this.unregisterObserver(message.data.notificationType, callback);
    }
  }

  public sendNotification(
    type: machine.mixins.NotificationType,
    message: object
  ) {
    if (this.isCurrentUser) {
      this.wallet.sendNotification(type, message);
    }
  }

  public sendResponse(
    res: cf.legacy.node.WalletResponse | cf.legacy.node.Notification
  ) {
    if (this.isCurrentUser) {
      this.wallet.sendResponse(res);
    }
  }

  public sendIoMessageToClient(message: any) {
    if (this.isCurrentUser) {
      this.wallet.sendIoMessageToClient(message);
    }
  }

  private registerMiddlewares() {
    this.instructionExecutor.register(
      machine.instructions.Opcode.ALL,
      async (
        message: machine.types.InternalMessage,
        next: Function,
        context: machine.instructionExecutor.Context
      ) => {
        this.wal.write(message, context);
      }
    );

    this.instructionExecutor.register(
      machine.instructions.Opcode.OP_SIGN,
      (message, next, context) => {
        const signature = signMyUpdate(context, this);
        context.intermediateResults.signature = signature;
      }
    );
    this.instructionExecutor.register(
      machine.instructions.Opcode.OP_SIGN_VALIDATE,
      async (
        message: machine.types.InternalMessage,
        next: Function,
        context: machine.instructionExecutor.Context
      ) => {
        return validateSignatures(message, next, context, this);
      }
    );
    this.instructionExecutor.register(
      machine.instructions.Opcode.IO_SEND,
      this.io.ioSendMessage.bind(this.io)
    );
    this.instructionExecutor.register(
      machine.instructions.Opcode.IO_WAIT,
      this.io.waitForIo.bind(this.io)
    );
    this.instructionExecutor.register(
      machine.instructions.Opcode.STATE_TRANSITION_COMMIT,
      this.store.setCommitment.bind(this.store)
    );
  }
}

/**
 * Plugin middleware methods.
 */

function signMyUpdate(
  context: machine.instructionExecutor.Context,
  user: User
): ethers.utils.Signature {
  const operation = context.intermediateResults.operation!;
  // TODO: @IIIIllllIIIIllllIIIIllllIIIIllllIIIIll Place digest in intermediateResults
  const digest = operation.hashToSign();
  const { recoveryParam, r, s } = user.signingKey.signDigest(digest);
  return { r, s, v: recoveryParam! + 27 };
}

async function validateSignatures(
  message: machine.types.InternalMessage,
  next: Function,
  context: machine.instructionExecutor.Context,
  user: User
) {
  const operation = context.intermediateResults.operation!;
  const digest = operation.hashToSign();
  let sig;
  const expectedSigningAddress =
    message.clientMessage.toAddress === user.address
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
    throw Error("Invalid signature");
  }
}

machine.mixins.applyMixins(User, [machine.mixins.Observable]);
