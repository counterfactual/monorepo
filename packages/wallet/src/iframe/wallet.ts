import * as ethers from "ethers";
import * as _ from "lodash";

import * as cf from "@counterfactual/cf.js";
import * as machine from "@counterfactual/machine";
import * as contracts from "./contracts";
import { User } from "./user";

export class IFrameWallet implements machine.types.ResponseSink {
  public static async deployMultisig(
    wallet: ethers.Wallet | ethers.providers.JsonRpcSigner,
    owners: machine.types.Address[]
  ): Promise<ethers.Contract> {
    const contractArtifacts = IFrameWallet.getContractArtifacts();

    const networkContext = machine.types.NetworkContext.fromDeployment(
      contracts.networkFile,
      contractArtifacts
    );

    const contract = await new ethers.ContractFactory(
      networkContext.Multisig.abi,
      networkContext.linkBytecode(networkContext.Multisig.bytecode),
      wallet
    ).deploy();
    owners.sort(
      (addrA, addrB) => (new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1)
    );
    await contract.functions.setup(owners);
    return contract;
  }

  /**
   * It's the wallet's responsibility to construct a machine.types.NetworkContext
   * and pass that to the VM.
   */
  public static defaultNetwork(): machine.types.NetworkContext {
    const contractArtifacts = IFrameWallet.getContractArtifacts();
    return machine.types.NetworkContext.fromDeployment(
      contracts.networkFile,
      contractArtifacts
    );
  }

  public static getContractArtifacts() {
    const artifacts = new Map();
    artifacts[machine.types.NetworkContext.CONTRACTS.Registry] = [
      JSON.stringify(contracts.Registry.abi),
      contracts.Registry.bytecode
    ];
    artifacts[machine.types.NetworkContext.CONTRACTS.PaymentApp] = [
      JSON.stringify(contracts.PaymentApp.abi),
      contracts.PaymentApp.bytecode
    ];
    artifacts[machine.types.NetworkContext.CONTRACTS.ConditionalTransfer] = [
      JSON.stringify(contracts.ConditionalTransfer.abi),
      contracts.ConditionalTransfer.bytecode
    ];
    artifacts[machine.types.NetworkContext.CONTRACTS.MultiSend] = [
      JSON.stringify(contracts.MultiSend.abi),
      contracts.MultiSend.bytecode
    ];
    artifacts[machine.types.NetworkContext.CONTRACTS.NonceRegistry] = [
      JSON.stringify(contracts.NonceRegistry.abi),
      contracts.NonceRegistry.bytecode
    ];
    artifacts[machine.types.NetworkContext.CONTRACTS.Signatures] = [
      JSON.stringify(contracts.Signatures.abi),
      contracts.Signatures.bytecode
    ];
    artifacts[machine.types.NetworkContext.CONTRACTS.StaticCall] = [
      JSON.stringify(contracts.StaticCall.abi),
      contracts.StaticCall.bytecode
    ];
    artifacts[machine.types.NetworkContext.CONTRACTS.ETHBalanceRefundApp] = [
      JSON.stringify(contracts.ETHBalanceRefundApp.abi),
      contracts.ETHBalanceRefundApp.bytecode
    ];
    artifacts[machine.types.NetworkContext.CONTRACTS.Multisig] = [
      JSON.stringify(contracts.MinimumViableMultisig.abi),
      contracts.MinimumViableMultisig.bytecode
    ];
    artifacts[machine.types.NetworkContext.CONTRACTS.AppInstance] = [
      JSON.stringify(contracts.AppInstance.abi),
      contracts.AppInstance.bytecode
    ];
    return artifacts;
  }

  get currentUser(): User {
    if (!this.address) {
      throw Error("could not find current user without machine.types.Address");
    }

    return this.users.get(this.address)!;
  }

  get network(): machine.types.NetworkContext {
    return this.networkContext;
  }

  public users: Map<string, User>;
  public address?: string;
  private networkContext: machine.types.NetworkContext;
  private requests: Map<string, Function>;
  private responseListener?: Function;
  private messageListener?: Function;

  constructor(networkContext?: machine.types.NetworkContext) {
    this.users = new Map<string, User>();
    this.requests = new Map<string, Function>();
    this.networkContext =
      networkContext !== undefined
        ? networkContext
        : IFrameWallet.defaultNetwork();
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
    networkContext?: machine.types.NetworkContext,
    db?: machine.wal.SyncDb,
    states?: machine.types.ChannelStates
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
  public async runProtocol(
    msg: machine.types.ClientActionMessage
  ): Promise<machine.types.WalletResponse> {
    const promise = new Promise<machine.types.WalletResponse>(
      (resolve, reject) => {
        this.requests[msg.requestId] = resolve;
      }
    );
    const response = this.currentUser.vm.receive(msg);
    return promise;
  }

  /**
   * Resolves the registered promise so the test can continue.
   */
  public sendResponse(
    res: machine.types.WalletResponse | machine.types.Notification
  ) {
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
  public receiveMessageFromPeer(incoming: machine.types.ClientActionMessage) {
    this.currentUser.io.receiveMessageFromPeer(incoming);
  }

  // TODO figure out which client to send the response to
  public sendResponseToClient(response: machine.types.ClientResponse) {
    if (this.responseListener) {
      this.responseListener(response);
    }
  }

  public sendMessageToClient(
    msg: machine.types.ClientResponse | machine.types.Notification
  ) {
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
  public sendIoMessageToClient(message: machine.types.ClientActionMessage) {
    if (this.messageListener) {
      this.messageListener(message);
    }
  }

  // TODO make messageListener a map/array
  public onMessage(callback: Function) {
    this.messageListener = callback;
  }

  public handleFreeBalanceQuery(query: machine.types.ClientQuery) {
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

  public sendNotification(type: cf.NotificationType, data: object) {
    const message: machine.types.Notification = {
      type: "machine.types.Notification",
      notificationType: type,
      data
    };

    this.sendResponse(message);
  }

  public addObserver(message: machine.types.ClientActionMessage) {
    this.currentUser.addObserver(message);
  }

  public removeObserver(message: machine.types.ClientActionMessage) {
    this.currentUser.removeObserver(message);
  }

  public setClientToHandleIO() {
    this.currentUser.io.setClientToHandleIO();
  }

  public handleStateChannelQuery(query: machine.types.ClientQuery) {
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

  public handleUserQuery(query: machine.types.ClientQuery) {
    const response = {
      requestId: query.requestId,
      data: {
        userAddress: this.address
      }
    };

    this.sendResponseToClient(response);
  }

  public async receiveMessageFromClient(
    incoming: machine.types.ClientActionMessage | machine.types.ClientQuery
  ) {
    incoming = machine.serializer.deserialize(incoming);

    if ("query" in incoming) {
      switch (incoming.query) {
        case machine.types.ClientQueryType.FreeBalance:
          this.handleFreeBalanceQuery(incoming);
          break;
        case machine.types.ClientQueryType.StateChannel:
          this.handleStateChannelQuery(incoming);
          break;
        case machine.types.ClientQueryType.User:
          this.handleUserQuery(incoming);
          break;
      }
    } else if (incoming.action) {
      switch (incoming.action) {
        case machine.types.ActionName.DEPOSIT: {
          await this.currentUser.deposit(incoming.data);
          break;
        }
        case machine.types.ActionName.DEPLOY_MULTISIG: {
          const multisigContract = await IFrameWallet.deployMultisig(
            this.currentUser.ethersWallet,
            incoming.data.owners
          );
          incoming.data = multisigContract.address;
          break;
        }
        case machine.types.ActionName.ADD_OBSERVER: {
          this.addObserver(incoming);
          break;
        }
        case machine.types.ActionName.REMOVE_OBSERVER: {
          this.removeObserver(incoming);
          break;
        }
        case machine.types.ActionName.REGISTER_IO: {
          this.setClientToHandleIO();
          break;
        }
        case machine.types.ActionName.RECEIVE_IO: {
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
