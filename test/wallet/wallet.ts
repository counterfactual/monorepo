import * as ethers from "ethers";
import * as _ from "lodash";

import networkFile from "../../contracts/networks/7777777.json";
import { NotificationType } from "../../src/mixins/observable";
import { deserialize } from "../../src/serializer";
import {
  ActionName,
  ChannelStates,
  ClientActionMessage,
  ClientQuery,
  ClientQueryType,
  ClientResponse,
  NetworkContext,
  Notification,
  ResponseSink,
  WalletResponse
} from "../../src/types";
import { SyncDb } from "../../src/wal";
import { User } from "./user";

export class TestWallet implements ResponseSink {
  get currentUser(): User {
    if (!this.address) {
      throw Error("could not find current user without address");
    }

    return this.users.get(this.address)!;
  }

  get network(): NetworkContext {
    return this.networkContext;
  }

  /**
   * If no network information is provided, this wallet uses dummy addresses
   * for contracts.
   *
   * This is mainly used for testing to ensure contract addresses do not
   * change with every deployment of the contracts in the test environment.
   */
  public static testNetwork(): NetworkContext {
    return new NetworkContext(
      "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd0",
      "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd1",
      "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd2",
      "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd3",
      "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
      "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd5",
      "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd6"
    );
  }

  public users: Map<string, User>;
  public address?: string;
  private networkContext: NetworkContext;
  private requests: Map<string, Function>;
  private responseListener?: Function;
  private messageListener?: Function;

  constructor(networkContext?: NetworkContext) {
    this.users = new Map<string, User>();
    this.requests = new Map<string, Function>();
    this.networkContext =
      networkContext !== undefined ? networkContext : this.defaultNetwork();
  }

  public setUser(
    address: string,
    privateKey: string,
    networkContext?: NetworkContext,
    db?: SyncDb,
    states?: ChannelStates
  ) {
    this.address = address;

    if (networkContext === undefined) {
      networkContext = this.networkContext;
    }

    if (!this.users.has(address)) {
      this.users.set(
        address,
        new User(this, address, privateKey, networkContext, db, states)
      );
    }
  }

  /**
   * The test will call this when it wants to start a protocol.
   * Returns a promise that resolves with a Response object when
   * the protocol has completed execution.
   */
  public async runProtocol(msg: ClientActionMessage): Promise<WalletResponse> {
    const promise = new Promise<WalletResponse>((resolve, reject) => {
      this.requests[msg.requestId] = resolve;
    });
    const response = this.currentUser.vm.receive(msg);
    return promise;
  }

  /**
   * Resolves the registered promise so the test can continue.
   */
  public sendResponse(res: WalletResponse | Notification) {
    if ("requestId" in res && this.requests[res.requestId] !== undefined) {
      const promise = this.requests[res.requestId];
      delete this.requests[res.requestId];
      promise(res);
    } else {
      this.sendMessageToClient(res);
    }
  }

  /**
   * Called When a peer wants to send an io messge to this wallet.
   */
  public receiveMessageFromPeer(incoming: ClientActionMessage) {
    this.currentUser.io.receiveMessageFromPeer(incoming);
  }

  // TODO figure out which client to send the response to
  public sendResponseToClient(response: ClientResponse) {
    if (this.responseListener) {
      this.responseListener(response);
    }
  }

  public sendMessageToClient(msg: ClientResponse | Notification) {
    if (this.responseListener) {
      this.responseListener(msg);
    }
  }

  // TODO make responseListener a map/array
  public onResponse(callback: Function) {
    this.responseListener = callback;
  }

  // TODO figure out which client to send the response to
  // TODO refactor to clarify difference with sendMessageToClient
  public sendIoMessageToClient(message: ClientActionMessage) {
    if (this.messageListener) {
      this.messageListener(message);
    }
  }

  // TODO make messageListener a map/array
  public onMessage(callback: Function) {
    this.messageListener = callback;
  }

  public handleFreeBalanceQuery(query: ClientQuery) {
    if (typeof query.multisigAddress === "string") {
      const freeBalance = this.currentUser.vm.cfState.freeBalanceFromMultisigAddress(
        query.multisigAddress
      );
      const response = {
        requestId: query.requestId,
        data: {
          freeBalance
        }
      };

      this.sendResponseToClient(response);
    }
  }

  public sendNotification(type: NotificationType, data: object) {
    const message: Notification = {
      type: "notification",
      notificationType: type,
      data
    };

    this.sendResponse(message);
  }

  public addObserver(message: ClientActionMessage) {
    this.currentUser.addObserver(message);
  }

  public removeObserver(message: ClientActionMessage) {
    this.currentUser.removeObserver(message);
  }

  public setClientToHandleIO() {
    this.currentUser.io.setClientToHandleIO();
  }

  public handleStateChannelQuery(query: ClientQuery) {
    if (typeof query.multisigAddress === "string") {
      const stateChannel = this.currentUser.vm.cfState.stateChannelFromMultisigAddress(
        query.multisigAddress
      );
      const response = {
        requestId: query.requestId,
        data: {
          stateChannel
        }
      };

      this.sendResponseToClient(response);
    }
  }

  public handleUserQuery(query: ClientQuery) {
    const response = {
      requestId: query.requestId,
      data: {
        userAddress: this.address
      }
    };

    this.sendResponseToClient(response);
  }

  public async receiveMessageFromClient(
    incoming: ClientActionMessage | ClientQuery
  ) {
    incoming = deserialize(incoming);

    if ("query" in incoming) {
      switch (incoming.query) {
        case ClientQueryType.FreeBalance:
          this.handleFreeBalanceQuery(incoming);
          break;
        case ClientQueryType.StateChannel:
          this.handleStateChannelQuery(incoming);
          break;
        case ClientQueryType.User:
          this.handleUserQuery(incoming);
          break;
      }
    } else if (incoming.action) {
      switch (incoming.action) {
        case ActionName.DEPOSIT: {
          await this.currentUser.deposit(incoming.data);
          break;
        }
        case ActionName.ADD_OBSERVER: {
          this.addObserver(incoming);
          break;
        }
        case ActionName.REMOVE_OBSERVER: {
          this.removeObserver(incoming);
          break;
        }
        case ActionName.REGISTER_IO: {
          this.setClientToHandleIO();
          break;
        }
        case ActionName.RECEIVE_IO: {
          this.currentUser.io.receiveMessageFromPeer(incoming.data);
          break;
        }
        default: {
          await this.runProtocol(incoming);
          break;
        }
      }
      this.sendResponseToClient(incoming);
    }
  }

  /**
   * It's the wallet's responsibility to construct a NetworkContext
   * and pass that to the VM.
   */
  private defaultNetwork(): NetworkContext {
    const networkMap = _.mapValues(
      _.keyBy(networkFile.contracts, "contractName"),
      "address"
    );
    return new NetworkContext(
      networkMap.Registry,
      networkMap.PaymentApp,
      networkMap.ConditionalTransfer,
      networkMap.MultiSend,
      networkMap.NonceRegistry,
      networkMap.Signatures,
      networkMap.StaticCall
    );
  }
}
