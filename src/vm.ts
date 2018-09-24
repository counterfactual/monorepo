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
import { CfVmWal } from "./wal";

export class CfVmConfig {
  constructor(
    readonly responseHandler: ResponseSink,
    readonly cfOpGenerator: CfOpGenerator,
    readonly wal: CfVmWal,
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
  /**
   * The write ahead log is used to keep track of protocol executions.
   * Specifically, whenever an instruction in a protocol is executed,
   * we write to the log so that, if the machine crashes, we can resume
   * by reading the last log entry and starting where the protocol left off.
   */
  public writeAheadLog: CfVmWal;

  // Obserable
  public observers: Map<NotificationType, Function[]> = new Map();

  constructor(config: CfVmConfig) {
    this.responseHandler = config.responseHandler;
    this.cfState = new CfState(
      config.state ? config.state : Object.create(null),
      config.network
    );
    this.middleware = new CfMiddleware(this.cfState, config.cfOpGenerator);
    this.writeAheadLog = config.wal;
  }

  public registerObserver(type: NotificationType, callback: Function) {}

  public unregisterObserver(type: NotificationType, callback: Function) {}

  public notifyObservers(type: NotificationType, data: object) {}

  /**
   * Restarts all protocols that were stopped mid execution, and returns when
   * they all finish.
   */
  public async resume() {
    const executions = this.writeAheadLog.read(this);
    return executions.reduce(
      (promise, exec) => promise.then(_ => this.run(exec)),
      Promise.resolve()
    );
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
    this.writeAheadLog.write(execution);
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
        this.writeAheadLog.write(execution);
      }
      this.sendResponse(execution, ResponseStatus.COMPLETED);
      this.writeAheadLog.clear(execution);
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
