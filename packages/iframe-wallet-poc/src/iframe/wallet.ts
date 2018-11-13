import * as cf from "@counterfactual/cf.js";
import AppInstanceJson from "@counterfactual/contracts/build/contracts/AppInstance.json";
import MinimumViableMultisigJson from "@counterfactual/contracts/build/contracts/MinimumViableMultisig.json";
import * as machine from "@counterfactual/machine";
import { ethers } from "ethers";
import * as _ from "lodash";

import { User } from "./user";

// TODO: This file, and all other files with `class` definitions, should be linted
// to follow a style with properties first, then constructor, then getters,
// public methods, private methods, etc. This should then be added as a project-wide
// linting rule.

export class IFrameWallet implements cf.node.ResponseSink {
  // TODO: We shouldn't need this after we change AppInstance.sol to be a global
  // channel manager contract as opposed to each instance being counterfactual
  public readonly appInstanceArtifact = AppInstanceJson;

  public async deployMultisig(
    wallet: ethers.Wallet | ethers.providers.JsonRpcSigner,
    owners: cf.utils.Address[]
  ): Promise<ethers.Contract> {
    const contract = await new ethers.ContractFactory(
      MinimumViableMultisigJson.abi,
      this.networkContext.linkedBytecode(MinimumViableMultisigJson.bytecode),
      wallet
    ).deploy();

    owners.sort((addrA, addrB) =>
      new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1
    );

    await contract.functions.setup(owners);

    return contract;
  }

  get currentUser(): User {
    if (!this.address) {
      throw Error("could not find current user without machine.types.Address");
    }

    return this.users.get(this.address)!;
  }

  get network(): cf.network.NetworkContext {
    return this.networkContext;
  }

  public users: Map<string, User>;
  public address?: string;
  private networkContext: cf.network.NetworkContext;
  private requests: Map<string, Function>;
  private responseListener?: Function;
  private messageListener?: Function;

  constructor(networkContext: cf.network.NetworkContext) {
    this.users = new Map<string, User>();
    this.requests = new Map<string, Function>();
    this.networkContext = networkContext;
  }

  // FIXME: Remove this method and refactor the network context data type.
  public static networkFileToNetworkContext(json: Object) {
    const tmp = _.mapValues(_.keyBy(json, "contractName"), "address");
    return new cf.network.NetworkContext(
      tmp["Registry"],
      tmp["PaymentApp"],
      tmp["ConditionalTransaction"],
      tmp["MultiSend"],
      tmp["NonceRegistry"],
      tmp["Signatures"],
      tmp["StaticCall"],
      tmp["ETHBalanceRefundApp"]
    );
  }

  public async initUser(address: string) {
    let user: User | undefined;
    user = this.users.get(address);
    if (user) {
      await user.init();
    }
  }

  public setUser(
    address: string,
    privateKey: string,
    networkContext?: cf.network.NetworkContext,
    db?: machine.writeAheadLog.SimpleStringMapSyncDB,
    states?: cf.channel.StateChannelInfos
  ) {
    this.address = address;

    if (!this.users.has(address)) {
      this.users.set(
        address,
        new User(
          this,
          address,
          privateKey,
          networkContext || this.network,
          db,
          states
        )
      );
    }
  }

  /**
   * The test will call this when it wants to start a protocol.
   * Returns a promise that resolves with a Response object when
   * the protocol has completed execution.
   */
  public async runProtocol(
    msg: cf.node.ClientActionMessage
  ): Promise<cf.node.WalletResponse> {
    const promise = new Promise<cf.node.WalletResponse>((resolve, reject) => {
      this.requests[msg.requestId] = resolve;
    });
    this.currentUser.instructionExecutor.receive(msg);
    return promise;
  }

  /**
   * Resolves the registered promise so the test can continue.
   */
  public sendResponse(res: cf.node.WalletResponse | cf.node.Notification) {
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
  public receiveMessageFromPeer(incoming: cf.node.ClientActionMessage) {
    this.currentUser.io.receiveMessageFromPeer(incoming);
  }

  //  TODO: figure out which client to send the response to
  public sendResponseToClient(response: cf.node.ClientResponse) {
    if (this.responseListener) {
      this.responseListener(response);
    }
  }

  public sendMessageToClient(
    msg: cf.node.ClientResponse | cf.node.Notification
  ) {
    if (this.responseListener) {
      this.responseListener(msg);
    }
  }

  //  TODO: make responseListener a map/array
  public onResponse(callback: Function) {
    this.responseListener = callback;
  }

  //  TODO: figure out which client to send the response to
  //  TODO: refactor to clarify difference with sendMessageToClient
  public sendIoMessageToClient(message: cf.node.ClientActionMessage) {
    if (this.messageListener) {
      this.messageListener(message);
    }
  }

  //  TODO: make messageListener a map/array
  public onMessage(callback: Function) {
    this.messageListener = callback;
  }

  public handleFreeBalanceQuery(query: cf.node.ClientQuery) {
    if (typeof query.multisigAddress === "string") {
      const freeBalance = this.currentUser.instructionExecutor.nodeState.freeBalanceFromMultisigAddress(
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

  public sendNotification(type: cf.NotificationType, data: object) {
    const message: cf.node.Notification = {
      data,
      type: "cf.node.Notification",
      notificationType: type
    };

    this.sendResponse(message);
  }

  public addObserver(message: cf.node.ClientActionMessage) {
    this.currentUser.addObserver(message);
  }

  public removeObserver(message: cf.node.ClientActionMessage) {
    this.currentUser.removeObserver(message);
  }

  public setClientToHandleIO() {
    this.currentUser.io.setClientToHandleIO();
  }

  public handleStateChannelQuery(query: cf.node.ClientQuery) {
    if (typeof query.multisigAddress === "string") {
      const stateChannel = this.currentUser.instructionExecutor.nodeState.stateChannelFromMultisigAddress(
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

  public handleUserQuery(query: cf.node.ClientQuery) {
    const response = {
      requestId: query.requestId,
      data: {
        userAddress: this.address,
        networkContext: this.networkContext
      }
    };

    this.sendResponseToClient(response);
  }

  private getMultisigAddressByToAddress(toAddress: string): string | undefined {
    const nodeState = this.currentUser.instructionExecutor.nodeState;
    return Object.keys(nodeState.channelStates).find(multisig => {
      return nodeState.channelStates[multisig].counterParty === toAddress;
    });
  }

  private async connect(toAddress: string): Promise<string> {
    const multisigContract = await this.deployMultisig(
      this.currentUser.ethersWallet,
      [this.currentUser.address, toAddress].sort()
    );
    return multisigContract.address;
  }

  public async receiveMessageFromClient(
    serializedIncoming: cf.node.ClientActionMessage | cf.node.ClientQuery
  ) {
    const incoming = cf.utils.serializer.deserialize(serializedIncoming);

    if ("query" in incoming) {
      switch (incoming.query) {
        case cf.node.ClientQueryType.FreeBalance:
          this.handleFreeBalanceQuery(incoming);
          break;
        case cf.node.ClientQueryType.StateChannel:
          this.handleStateChannelQuery(incoming);
          break;
        case cf.node.ClientQueryType.User:
          this.handleUserQuery(incoming);
          break;
      }
    } else if (incoming.action) {
      switch (incoming.action) {
        case cf.node.ActionName.DEPOSIT: {
          await this.currentUser.deposit(incoming.data);
          break;
        }
        case cf.node.ActionName.CONNECT: {
          const toAddress = incoming.data.toAddress;
          incoming.data.multisigAddress = this.getMultisigAddressByToAddress(
            toAddress
          );

          if (!incoming.data.multisigAddress) {
            incoming.data.generatedNewMultisig = true;
            incoming.data.multisigAddress = await this.connect(toAddress);
          }

          break;
        }
        case cf.node.ActionName.ADD_OBSERVER: {
          this.addObserver(incoming);
          break;
        }
        case cf.node.ActionName.REMOVE_OBSERVER: {
          this.removeObserver(incoming);
          break;
        }
        case cf.node.ActionName.REGISTER_IO: {
          this.setClientToHandleIO();
          break;
        }
        case cf.node.ActionName.RECEIVE_IO: {
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
}
