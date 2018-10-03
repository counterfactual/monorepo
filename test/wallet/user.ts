import * as ethers from "ethers";

import { Instruction } from "../../src/instructions";
import { EthCfOpGenerator } from "../../src/middleware/cf-operation/cf-op-generator";
import { CfOperation } from "../../src/middleware/cf-operation/types";
import { getFirstResult, getLastResult } from "../../src/middleware/middleware";
import { applyMixins } from "../../src/mixins/apply";
import { NotificationType, Observable } from "../../src/mixins/observable";
import { Context } from "../../src/state";
import {
  ChannelStates,
  ClientActionMessage,
  InternalMessage,
  NetworkContext,
  Notification,
  ResponseSink,
  Signature,
  WalletResponse
} from "../../src/types";
import { CfVmConfig, CounterfactualVM } from "../../src/vm";
import { CfVmWal, MemDb, SyncDb } from "../../src/wal";
import { CommitmentStore } from "./commitmentStore";
import { IoProvider } from "./ioProvider";
import { TestWallet } from "./wallet";

let ganacheURL;

try {
  ganacheURL = process.env.GANACHE_URL || "http://localhost:9545";
} catch (e) {
  ganacheURL = "http://localhost:9545";
}

export class User implements Observable, ResponseSink {
  get isCurrentUser(): boolean {
    return this.wallet.currentUser === this;
  }

  public blockchainProvider: ethers.providers.BaseProvider;
  public signer: ethers.SigningKey;
  public ethersWallet: ethers.Wallet;
  public vm: CounterfactualVM;
  public io: IoProvider;
  public address: string;
  public store: CommitmentStore;

  // Observable
  public observers: Map<NotificationType, Function[]> = new Map();
  private observerCallbacks: Map<string, Function> = new Map<
    string,
    Function
  >();

  constructor(
    readonly wallet: TestWallet,
    address: string,
    privateKey: string,
    networkContext: NetworkContext,
    db?: SyncDb,
    states?: ChannelStates
  ) {
    this.wallet = wallet;
    this.address = address;
    this.io = new IoProvider(this);
    this.vm = new CounterfactualVM(
      new CfVmConfig(
        this,
        new EthCfOpGenerator(),
        new CfVmWal(db !== undefined ? db : new MemDb()),
        networkContext,
        states
      )
    );
    this.store = new CommitmentStore();
    this.io.ackMethod = this.vm.startAck.bind(this.vm);
    this.registerMiddlewares();
    this.vm.registerObserver(
      "actionCompleted",
      this.handleActionCompletion.bind(this)
    );

    this.signer = new ethers.SigningKey(privateKey);
    this.address = this.signer.address;
    this.blockchainProvider = new ethers.providers.JsonRpcProvider(ganacheURL);

    this.ethersWallet = new ethers.Wallet(privateKey, this.blockchainProvider);
  }

  public async deposit(options) {
    await this.ethersWallet.sendTransaction({
      to: options.multisig,
      value: options.value
    });
  }

  public registerObserver(type: NotificationType, callback: Function) {}

  public unregisterObserver(type: NotificationType, callback: Function) {}

  public notifyObservers(type: NotificationType, data: object) {}

  public handleActionCompletion(notification: Notification) {
    this.notifyObservers(`${notification.data.name}Completed`, {
      requestId: notification.data.requestId,
      result: this.generateObserverNotification(notification),
      clientMessage: notification.data.clientMessage
    });
  }

  public generateObserverNotification(notification: Notification): any {
    return notification.data.results.find(result => result.opCode === 0).value;
  }

  public addObserver(message: ClientActionMessage) {
    const boundNotification = this.sendNotification.bind(
      this,
      message.data.notificationType
    );
    this.observerCallbacks.set(message.data.observerId, boundNotification);
    this.registerObserver(message.data.notificationType, boundNotification);
  }

  public removeObserver(message: ClientActionMessage) {
    const callback = this.observerCallbacks.get(message.data.observerId);

    if (callback) {
      this.unregisterObserver(message.data.notificationType, callback);
    }
  }

  public sendNotification(type: NotificationType, message: object) {
    if (this.isCurrentUser) {
      this.wallet.sendNotification(type, message);
    }
  }

  public sendResponse(res: WalletResponse | Notification) {
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
    this.vm.register(
      Instruction.OP_SIGN,
      async (message: InternalMessage, next: Function, context: Context) => {
        return signMyUpdate(message, next, context, this);
      }
    );
    this.vm.register(
      Instruction.OP_SIGN_VALIDATE,
      async (message: InternalMessage, next: Function, context: Context) => {
        return validateSignatures(message, next, context, this);
      }
    );
    this.vm.register(Instruction.IO_SEND, this.io.ioSendMessage.bind(this.io));
    this.vm.register(Instruction.IO_WAIT, this.io.waitForIo.bind(this.io));
    this.vm.register(
      Instruction.STATE_TRANSITION_COMMIT,
      this.store.setCommitment.bind(this.store)
    );
  }
}

/**
 * Plugin middleware methods.
 */

async function signMyUpdate(
  message: InternalMessage,
  next: Function,
  context: Context,
  user: User
): Promise<Signature> {
  const operation: CfOperation = getFirstResult(
    Instruction.OP_GENERATE,
    context.results
  ).value;
  const digest = operation.hashToSign();
  const sig = user.signer.signDigest(digest);
  return new Signature(sig.recoveryParam! + 27, sig.r, sig.s);
}

async function validateSignatures(
  message: InternalMessage,
  next: Function,
  context: Context,
  user: User
) {
  const op: CfOperation = getLastResult(
    Instruction.OP_GENERATE,
    context.results
  ).value;
  const digest = op.hashToSign();
  let sig;
  const expectedSigningAddress =
    message.clientMessage.toAddress === user.address
      ? message.clientMessage.fromAddress
      : message.clientMessage.toAddress;
  if (message.clientMessage.signature === undefined) {
    // initiator
    const incomingMessage = getLastResult(Instruction.IO_WAIT, context.results)
      .value;
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

applyMixins(User, [Observable]);
