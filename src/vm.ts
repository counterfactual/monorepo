import { Action, ActionExecution } from "./action";
import { Instruction } from "./instructions";
import { CfMiddleware, CfOpGenerator } from "./middleware/middleware";
import { applyMixins } from "./mixins/apply";
import { NotificationType, Observable } from "./mixins/observable";
import { CfState } from "./state";
import {
  Addressable,
  ChannelStates,
  ClientActionMessage,
  NetworkContext,
  ResponseSink,
  StateChannelInfo,
  WalletResponse
} from "./types";
import { Log } from "./wal";

export class CfVmConfig {
  constructor(
    readonly responseHandler: ResponseSink,
    readonly cfOpGenerator: CfOpGenerator,
    readonly network: NetworkContext,
    readonly state?: ChannelStates
  ) {}
}

export class CounterfactualVM implements Observable {
  /**
   * The object responsible for processing each Instruction in the Vm.
   */
  public middleware: CfMiddleware;
  /**
   * The delegate handler we send responses to.
   */
  public responseHandler: ResponseSink;
  /**
   * The underlying state for the entire machine. All state here is a result of
   * a completed and commited protocol.
   */
  public cfState: CfState;

  // Observable
  public observers: Map<NotificationType, Function[]> = new Map();

  constructor(config: CfVmConfig) {
    this.responseHandler = config.responseHandler;
    this.cfState = new CfState(
      config.state ? config.state : Object.create(null),
      config.network
    );
    this.middleware = new CfMiddleware(this.cfState, config.cfOpGenerator);
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

  public startAck(message: ClientActionMessage) {
    this.execute(new Action(message.requestId, message.action, message, true));
  }

  // TODO add support for not appID
  public getStateChannelFromAddressable(data: Addressable): StateChannelInfo {
    if (data.appId) {
      return this.cfState.appChannelInfos[data.appId].stateChannel;
    } else {
      throw Error("No app id available");
    }
  }

  public receive(msg: ClientActionMessage): WalletResponse {
    this.validateMessage(msg);
    const action = new Action(msg.requestId, msg.action, msg);
    this.execute(action);
    return new WalletResponse(action.requestId, ResponseStatus.STARTED);
  }

  public validateMessage(msg: ClientActionMessage) {
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
      // temporary error handling for testing resuming protocols
      let val;
      for await (val of execution) {
      }
      this.sendResponse(execution, ResponseStatus.COMPLETED);
    } catch (e) {
      console.error(e);
      this.sendResponse(execution, ResponseStatus.ERROR);
    }
  }

  public sendResponse(execution: ActionExecution, status: ResponseStatus) {
    if (!execution.action.isAckSide) {
      this.responseHandler.sendResponse(
        new Response(execution.action.requestId, status)
      );
    }
  }

  public mutateState(state: ChannelStates) {
    Object.assign(this.cfState.channelStates, state);
  }

  public register(scope: Instruction, method: Function) {
    this.middleware.add(scope, method);
  }
}

export class Response {
  constructor(
    readonly requestId: string,
    readonly status: ResponseStatus,
    error?: string
  ) {}
}

export enum ResponseStatus {
  STARTED,
  ERROR,
  COMPLETED
}

applyMixins(CounterfactualVM, [Observable]);
