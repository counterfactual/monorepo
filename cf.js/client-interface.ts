import * as ethers from "ethers";
import Multisig from "../contracts/build/contracts/MinimumViableMultisig.json";
import {
  ActionName,
  ClientActionMessage,
  ClientMessage,
  ClientQuery,
  ClientQueryType,
  ClientResponse,
  NetworkContext,
  Notification,
  UserDataClientResponse,
  WalletMessage,
  WalletMessaging,
  WalletResponse
} from "../src/types";

import { applyMixins } from "../src/mixins/apply";
import { NotificationType, Observable } from "../src/mixins/observable";
import { StateChannelClient } from "./state-channel-client";

export class ClientInterface implements Observable {
  get address(): string {
    // TODO cleanup
    return this.userAddress || "";
  }

  // TODO: remove `networkContext` when contract linking is setup properly
  public static async deployMultisig(
    wallet: ethers.Wallet,
    owners: string[],
    networkContext: NetworkContext
  ): Promise<ethers.Contract> {
    Multisig.bytecode = Multisig.bytecode.replace(
      /__Signatures_+/g,
      networkContext.Signatures.substr(2)
    );
    const multisig = new ethers.Contract("", Multisig.abi, wallet);
    const contract = await multisig.deploy(Multisig.bytecode);
    await contract.functions.setup(owners);
    return contract;
  }

  public wallet: WalletMessaging;
  public userId: string;
  public userAddress?: string;
  public ioHandler?: Function;

  public outstandingRequests: {
    [key: string]: { resolve: Function; reject: Function };
  };
  public stateChannels: { [key: string]: StateChannelClient };

  // Obserable
  public observers: Map<NotificationType, Function[]> = new Map();
  private observerCallbacks: Map<string, Function>;

  constructor(userId: string, wallet: WalletMessaging) {
    this.userId = userId;
    this.wallet = wallet;
    this.outstandingRequests = {};
    this.observerCallbacks = new Map<string, Function>();
    this.stateChannels = {};
  }

  public registerObserver(type: NotificationType, callback: Function) {}

  public unregisterObserver(type: NotificationType, callback: Function) {}

  public notifyObservers(type: NotificationType, data: object) {}

  public async init() {
    this.clearObservers();
    this.setupListener();
    const userData = await this.queryUser();
    this.userAddress = userData.data.userAddress;
  }

  public requestId(): string {
    return Math.random() + "";
  }

  public async queryUser(): Promise<UserDataClientResponse> {
    const userQuery: ClientQuery = {
      requestId: this.requestId(),
      action: ActionName.QUERY,
      query: ClientQueryType.User,
      userId: this.userId
    };
    const userData = (await this.sendMessage(
      userQuery
    )) as UserDataClientResponse;
    return userData;
  }

  public registerIOSendMessage(callback: Function) {
    this.ioHandler = callback;
    this.sendMessage({
      requestId: this.requestId(),
      action: ActionName.REGISTER_IO
    });
  }

  public sendIOMessage(msg: ClientMessage) {
    if (this.ioHandler) {
      this.ioHandler(msg);
    }
  }

  public receiveIOMessage(msg: ClientMessage) {
    const message = {
      action: ActionName.RECEIVE_IO,
      data: msg,
      requestId: this.requestId()
    };
    this.sendMessage(message);
  }

  public listenForResponse(requestId: string) {}

  public async createChannelWith(
    toAddress: string,
    multisigAddress: string
  ): Promise<string> {
    const channel = await this.setup(toAddress, multisigAddress);
    const channelInfo = await channel.queryStateChannel();

    return channelInfo.data.stateChannel.multisigAddress;
  }

  // TODO Add type here
  public async sendMessage(message: ClientMessage): Promise<ClientResponse> {
    const id = message.requestId;
    let resolve;
    let reject;
    const promise: Promise<ClientResponse> = new Promise((re, rj) => {
      resolve = re;
      reject = rj;
    });

    this.outstandingRequests[id] = { resolve, reject };
    this.wallet.postMessage(message, "*");
    return promise;
  }

  // TODO Add type here
  public processMessage(
    message: WalletMessage | WalletResponse | Notification
  ) {
    // TODO handle not finished states
    if ("requestId" in message) {
      if (this.outstandingRequests[message.requestId]) {
        this.outstandingRequests[message.requestId].resolve(message);
      }
    }
    if ("notificationType" in message) {
      this.notifyObservers(message.notificationType, message);
    }

    // TODO handle failure
  }

  public setupListener() {
    this.wallet.onMessage(
      this.userId,
      (message: WalletMessage | WalletResponse) => {
        this.processMessage(message);
      }
    );
  }

  // TODO add methods also on stateChannel and appChannel objects
  public addObserver(
    notificationType: string,
    callback: Function
  ): Promise<ClientResponse> {
    const observerId = this.requestId();

    this.observerCallbacks.set(observerId, callback);
    this.registerObserver(notificationType, callback);

    const message = {
      requestId: this.requestId(),
      action: ActionName.ADD_OBSERVER,
      data: {
        observerId,
        notificationType
      }
    };

    return this.sendMessage(message);
  }

  public removeObserver(
    notificationType: string,
    callback: Function
  ): Promise<ClientResponse> {
    let observerId;

    this.observerCallbacks.forEach((value: Function, key: string) => {
      if (value === callback) {
        observerId = key;
      }
    });

    if (!observerId) {
      throw Error(`unable to find observer for ${notificationType}`);
    }

    this.unregisterObserver(notificationType, callback);

    const message = {
      requestId: this.requestId(),
      action: ActionName.REMOVE_OBSERVER,
      data: {
        observerId,
        notificationType
      }
    };

    return this.sendMessage(message);
  }

  public getStateChannel(multisigAddress: string): StateChannelClient {
    return this.stateChannels[multisigAddress];
  }

  public getOrCreateStateChannel(
    multisigAddress: string,
    toAddr: string
  ): StateChannelClient {
    if (!this.stateChannels[multisigAddress]) {
      this.stateChannels[multisigAddress] = new StateChannelClient(
        toAddr,
        this.address,
        multisigAddress,
        this
      );
    }
    return this.getStateChannel(multisigAddress);
  }

  // TODO pass in actual multisig address and requestId
  public async setup(
    toAddr: string,
    multisigAddress: string
  ): Promise<StateChannelClient> {
    const message: ClientActionMessage = {
      requestId: this.requestId(),
      appId: undefined,
      action: ActionName.SETUP,
      data: {},
      multisigAddress,
      toAddress: toAddr,
      fromAddress: this.address,
      stateChannel: undefined,
      seq: 0
    };
    await this.sendMessage(message);

    return this.getOrCreateStateChannel(message.multisigAddress, toAddr);
  }

  private clearObservers() {
    this.observers = new Map();
    this.observerCallbacks = new Map<string, Function>();
  }
}

applyMixins(ClientInterface, [Observable]);
