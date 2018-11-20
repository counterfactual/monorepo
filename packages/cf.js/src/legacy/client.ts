import { Channel } from "./channel";
import { applyMixins } from "./mixins/apply";
import { NotificationType, Observable } from "./mixins/observable";
import {
  ActionName,
  ClientActionMessage,
  ClientMessage,
  ClientQuery,
  ClientQueryType,
  ClientResponse,
  UserDataClientResponse,
  WalletMessage,
  WalletMessaging,
  WalletResponse
} from "./node";

export class Client implements Observable {
  get address(): string {
    //  TODO: cleanup
    return this.userAddress || "";
  }

  public wallet: WalletMessaging;
  public userAddress?: string;
  public networkContext: Map<string, string>;
  public ioHandler?: Function;

  public outstandingRequests: {
    [key: string]: { resolve: Function; reject: Function };
  };
  public stateChannels: { [key: string]: Channel };

  // Obserable
  public observers: Map<NotificationType, Function[]> = new Map();
  private observerCallbacks: Map<string, Function>;

  constructor(wallet: WalletMessaging) {
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

  public generateRequestId(): string {
    // TODO: use uuids when one of the following conditions is met:
    // 1) we no longer need to support ethmo/iframe wallet
    // 2) `node-uuid` has a working browser-ready version:
    //    https://github.com/kelektiv/node-uuid/issues/176
    // until, we just use Math.random so that the iife build works without
    // depending on a global uuid moddule

    return Math.random().toString();
  }

  public async queryUser(): Promise<UserDataClientResponse> {
    const userQuery: ClientQuery = {
      requestId: this.generateRequestId(),
      action: ActionName.QUERY,
      query: ClientQueryType.User
    };
    return (await this.sendMessage(userQuery)) as UserDataClientResponse;
  }

  public registerIOSendMessage(callback: Function) {
    this.ioHandler = callback;
    this.sendMessage({
      requestId: this.generateRequestId(),
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
      requestId: this.generateRequestId()
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
    message: ClientMessage | ClientActionMessage
  ): Promise<ClientResponse> {
    const id = message.requestId;
    let resolve;
    let reject;
    const promise: Promise<ClientResponse> = new Promise((re, rj) => {
      resolve = re;
      reject = rj;
    });
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
  ): Promise<ClientResponse> {
    const observerId = this.generateRequestId();

    this.observerCallbacks.set(observerId, callback);
    this.registerObserver(notificationType, callback);

    const message = {
      requestId: this.generateRequestId(),
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

    const entries = this.observerCallbacks.entries();
    let entry: IteratorResult<[string, Function]>;

    while ((entry = entries.next())) {
      const [key, value] = entry.value;
      if (value === callback) {
        observerId = key;
        break;
      }
    }

    if (!observerId) {
      throw Error(`unable to find observer for ${notificationType}`);
    }

    this.unregisterObserver(notificationType, callback);

    const message = {
      requestId: this.generateRequestId(),
      action: ActionName.REMOVE_OBSERVER,
      data: {
        observerId,
        notificationType
      }
    };

    return this.sendMessage(message);
  }

  public getStateChannel(multisigAddress: string): Channel {
    return this.stateChannels[multisigAddress];
  }

  public async connect(toAddress: string): Promise<Channel> {
    const {
      data: { multisigAddress, generatedNewMultisig }
    } = await this.sendMessage({
      requestId: this.generateRequestId(),
      action: ActionName.CONNECT,
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
      multisigAddress,
      toAddress,
      requestId: this.generateRequestId(),
      appId: undefined,
      action: ActionName.SETUP,
      data: {},
      fromAddress: this.address,
      stateChannel: undefined,
      seq: 0
    });
  }

  private instantiateStateChannel(multisigAddress, toAddress): Channel {
    if (!this.stateChannels[multisigAddress]) {
      this.stateChannels[multisigAddress] = new Channel(
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
