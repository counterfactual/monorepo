import * as cf from "@counterfactual/cf.js";

import { Action, ActionExecution } from "./action";
import { Instruction } from "./instructions";
import { Middleware, OpGenerator } from "./middleware/middleware";
import { applyMixins } from "./mixins/apply";
import { NotificationType, Observable } from "./mixins/observable";
import { State } from "./state";
import {
  Addressable,
  AddressableLookupResolverHash,
  InstructionMiddlewareCallback
} from "./types";
import { Log } from "./write-ahead-log";

export class VmConfig {
  constructor(
    readonly responseHandler: cf.node.ResponseSink,
    readonly cfOpGenerator: OpGenerator,
    readonly network: cf.utils.NetworkContext,
    readonly state?: cf.channel.ChannelStates
  ) {}
}

/**
 * This resolver hash is used in the getStateChannelFromAddressable method. According
 * to any key available in the Addressable interface, it'll fetch an instance of
 * StateChannelInfo from the corresponding source.
 */
const ADDRESSABLE_LOOKUP_RESOLVERS: AddressableLookupResolverHash = {
  appId: (state: State, appId: cf.utils.H256) =>
    state.appChannelInfos[appId].stateChannel,

  multisigAddress: (state: State, multisigAddress: cf.utils.Address) =>
    state.stateChannelFromMultisigAddress(multisigAddress),

  toAddress: (state: State, toAddress: cf.utils.Address) =>
    state.stateChannelFromAddress(toAddress)
};

export class VM implements Observable {
  /**
   * The object responsible for processing each Instruction in the Vm.
   */
  public middleware: Middleware;
  /**
   * The delegate handler we send responses to.
   */
  public responseHandler: cf.node.ResponseSink;
  /**
   * The underlying state for the entire machine. All state here is a result of
   * a completed and commited protocol.
   */
  public state: State;

  // Observable
  public observers: Map<NotificationType, Function[]> = new Map();

  constructor(config: VmConfig) {
    this.responseHandler = config.responseHandler;
    this.state = new State(
      config.state ? config.state : Object.create(null),
      config.network
    );
    this.middleware = new Middleware(this.state, config.cfOpGenerator);
  }
  public registerObserver(type: NotificationType, callback: Function) {}
  public unregisterObserver(type: NotificationType, callback: Function) {}
  public notifyObservers(type: NotificationType, data: object) {}
  /**
   * Restarts all protocols that were stopped mid execution, and returns when
   * they all finish.
   */
  public async resume(log: Log) {
    const executions = this.buildExecutionsFromLog(log);
    return executions.reduce(
      (promise, exec) => promise.then(_ => this.run(exec)),
      Promise.resolve()
    );
  }

  /**
   * @returns all unfinished protocol executions read from the db.
   */
  public buildExecutionsFromLog(log: Log): ActionExecution[] {
    return Object.keys(log).map(key => {
      const entry = log[key];
      const action = new Action(
        entry.requestId,
        entry.actionName,
        entry.clientMessage,
        entry.isAckSide
      );
      const execution = new ActionExecution(
        action,
        entry.instructionPointer,
        entry.clientMessage,
        this
      );
      execution.results = entry.results;
      action.execution = execution;
      return execution;
    });
  }

  public startAck(message: cf.node.ClientActionMessage) {
    this.execute(new Action(message.requestId, message.action, message, true));
  }

  public getStateChannelFromAddressable(
    data: Addressable
  ): cf.channel.StateChannelInfo {
    const [lookupKey] = Object.keys(data).filter(key => Boolean(data[key]));
    const lookup = ADDRESSABLE_LOOKUP_RESOLVERS[lookupKey];

    if (!lookup) {
      throw Error(
        "Cannot get state channel info without appID, multisigAddress or toAddress"
      );
    }

    return lookup(this.state, data[lookupKey]);
  }

  public receive(msg: cf.node.ClientActionMessage): cf.node.WalletResponse {
    this.validateMessage(msg);
    const action = new Action(msg.requestId, msg.action, msg);
    this.execute(action);
    return new cf.node.WalletResponse(
      action.requestId,
      cf.node.ResponseStatus.STARTED
    );
  }

  public validateMessage(msg: cf.node.ClientActionMessage) {
    // TODO;
    return true;
  }

  public async execute(action: Action) {
    const execution = action.makeExecution(this);
    await this.run(execution);

    this.notifyObservers("actionCompleted", {
      type: "notification",
      NotificationType: "actionCompleted",
      data: {
        requestId: action.requestId,
        name: action.name,
        results: execution.results,
        clientMessage: action.clientMessage
      }
    });
  }

  public async run(execution: ActionExecution) {
    try {
      // Temporary error handling for testing resuming protocols
      let val;
      // TODO: Bizarre syntax...
      // https://github.com/counterfactual/monorepo/issues/123
      for await (val of execution) {
      }
      this.sendResponse(execution, cf.node.ResponseStatus.COMPLETED);
    } catch (e) {
      console.error(e);
      this.sendResponse(execution, cf.node.ResponseStatus.ERROR);
    }
  }

  public sendResponse(
    execution: ActionExecution,
    status: cf.node.ResponseStatus
  ) {
    if (!execution.action.isAckSide) {
      this.responseHandler.sendResponse(
        new cf.node.Response(execution.action.requestId, status)
      );
    }
  }

  public mutateState(state: cf.channel.ChannelStates) {
    Object.assign(this.state.channelStates, state);
  }

  public register(scope: Instruction, method: InstructionMiddlewareCallback) {
    this.middleware.add(scope, method);
  }
}

applyMixins(VM, [Observable]);
