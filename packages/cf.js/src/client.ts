import * as machine from "@counterfactual/machine";
import { applyMixins } from "./mixins/apply";
import { NotificationType, Observable } from "./mixins/observable";
import { StateChannelClient } from "./state-channel-client";

type WalletMessage = machine.types.WalletMessage;
type WalletResponse = machine.types.WalletResponse;

export class Client implements Observable {
  get address(): string {
    //  TODO: cleanup
    return this.userAddress || "";
  }

  public wallet: machine.types.WalletMessaging;
  public userAddress?: string;
  public networkContext: Map<string, string>;
  public ioHandler?: Function;

  public outstandingRequests: {
    [key: string]: { resolve: Function; reject: Function };
  };
  public stateChannels: { [key: string]: StateChannelClient };

  // Obserable
  public observers: Map<NotificationType, Function[]> = new Map();
  private observerCallbacks: Map<string, Function>;

  constructor(wallet: machine.types.WalletMessaging) {
    this.wallet = wallet;
    this.outstandingRequests = {};
    this.observerCallbacks = new Map<string, Function>();
    this.stateChannels = {};
    this.networkContext = new Map<string, string>();
  }

  public registerObserver(type: NotificationType, callback: Function) {}

  public unregisterObserver(type: NotificationType, callback: Function) {}

  public notifyObservers(type: NotificationType, data: object) {}

  public async init() {
    this.clearObservers();
    this.setupListener();
    const userData = await this.queryUser();
    this.userAddress = userData.data.userAddress;
    this.networkContext = userData.data.networkContext;
  }

  public requestId(): string {
    return Math.random() + "";
  }

  public async queryUser(): Promise<machine.types.UserDataClientResponse> {
    const userQuery: machine.types.ClientQuery = {
      requestId: this.requestId(),
      action: machine.types.ActionName.QUERY,
      query: machine.types.ClientQueryType.User
    };
    const userData = (await this.sendMessage(
      userQuery
    )) as machine.types.UserDataClientResponse;
    return userData;
  }

  public registerIOSendMessage(callback: Function) {
    this.ioHandler = callback;
    this.sendMessage({
      requestId: this.requestId(),
      action: machine.types.ActionName.REGISTER_IO
    });
  }

  public sendIOMessage(msg: machine.types.ClientMessage) {
    if (this.ioHandler) {
      this.ioHandler(msg);
    }
  }

  public receiveIOMessage(msg: machine.types.ClientMessage) {
    const message = {
      action: machine.types.ActionName.RECEIVE_IO,
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
    const channel = await this.connect(toAddress);
    const channelInfo = await channel.queryStateChannel();

    return channelInfo.data.stateChannel.multisigAddress;
  }

  // TODO: Add type here
  public async sendMessage(
    message: machine.types.ClientMessage | machine.types.ClientActionMessage
  ): Promise<machine.types.ClientResponse> {
    const id = message.requestId;
    let resolve;
    let reject;
    const promise: Promise<machine.types.ClientResponse> = new Promise(
      (re, rj) => {
        resolve = re;
        reject = rj;
      }
    );

    this.outstandingRequests[id] = { resolve, reject };
    this.wallet.postMessage(message);
    return promise;
  }

  // TODO: Add type here
  public processMessage(
    message: WalletMessage | WalletResponse | Notification
  ) {
    //  TODO: handle not finished states
    if ("requestId" in message) {
      if (this.outstandingRequests[message.requestId]) {
        this.outstandingRequests[message.requestId].resolve(message);
      }
    }
    if ("notificationType" in message) {
      // @ts-ignore
      this.notifyObservers(message.notificationType, message);
    }

    //  TODO: handle failure
  }

  public setupListener() {
    this.wallet.onMessage((message: WalletMessage | WalletResponse) => {
      this.processMessage(message);
    });
  }

  //  TODO: add methods also on stateChannel and appChannel objects
  public addObserver(
    notificationType: string,
    callback: Function
  ): Promise<machine.types.ClientResponse> {
    const observerId = this.requestId();

    this.observerCallbacks.set(observerId, callback);
    this.registerObserver(notificationType, callback);

    const message = {
      requestId: this.requestId(),
      action: machine.types.ActionName.ADD_OBSERVER,
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
  ): Promise<machine.types.ClientResponse> {
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
      action: machine.types.ActionName.REMOVE_OBSERVER,
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

  public async connect(toAddress: string): Promise<StateChannelClient> {
    const {
      data: { multisigAddress, generatedNewMultisig }
    } = await this.sendMessage({
      requestId: this.requestId(),
      action: machine.types.ActionName.CONNECT,
      data: {
        toAddress
      }
    });

    if (generatedNewMultisig) {
      await this.setup(multisigAddress, toAddress);
    }

    return this.instantiateStateChannel(multisigAddress, toAddress);
  }

  private async setup(multisigAddress: string, toAddress: string) {
    await this.sendMessage({
      requestId: this.requestId(),
      appId: undefined,
      action: machine.types.ActionName.SETUP,
      data: {},
      multisigAddress,
      toAddress,
      fromAddress: this.address,
      stateChannel: undefined,
      seq: 0
    });
  }

  private instantiateStateChannel(
    multisigAddress,
    toAddress
  ): StateChannelClient {
    if (!this.stateChannels[multisigAddress]) {
      this.stateChannels[multisigAddress] = new StateChannelClient(
        toAddress,
        this.address,
        multisigAddress,
        this
      );
    }

    return this.getStateChannel(multisigAddress);
  }

  private clearObservers() {
    this.observers = new Map();
    this.observerCallbacks = new Map<string, Function>();
  }
}

applyMixins(Client, [Observable]);
