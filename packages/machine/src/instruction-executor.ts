import * as cf from "@counterfactual/cf.js";

import { ActionExecution, instructionGroupFromProtocolName } from "./action";
import { Opcode } from "./instructions";
import { Middleware, OpGenerator } from "./middleware/middleware";
import { applyMixins } from "./mixins/apply";
import { NotificationType, Observable } from "./mixins/observable";
import { NodeState } from "./node-state";
import { InstructionMiddlewareCallback, OpCodeResult } from "./types";
import { Log } from "./write-ahead-log";

export class InstructionExecutorConfig {
  constructor(
    readonly responseHandler: cf.node.ResponseSink,
    readonly opGenerator: OpGenerator,
    readonly network: cf.network.NetworkContext,
    readonly state?: cf.channel.StateChannelInfos
  ) {}
}

export class InstructionExecutor implements Observable {
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
  public nodeState: NodeState;

  // Observable
  public observers: Map<NotificationType, Function[]> = new Map();

  constructor(config: InstructionExecutorConfig) {
    this.responseHandler = config.responseHandler;
    this.nodeState = new NodeState(config.state || {}, config.network);
    this.middleware = new Middleware(this.nodeState, config.opGenerator);
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
  private buildExecutionsFromLog(log: Log): ActionExecution[] {
    return Object.keys(log).map(key => {
      const entry = log[key];
      const execution = new ActionExecution(
        entry.actionName,
        instructionGroupFromProtocolName(entry.actionName, entry.isAckSide),
        entry.instructionPointer,
        entry.clientMessage,
        this,
        entry.isAckSide,
        entry.requestId
      );
      execution.results2 = entry.results;
      return execution;
    });
  }

  public receiveClientActionMessageAck(msg: cf.node.ClientActionMessage) {
    this.execute(
      new ActionExecution(
        msg.action,
        instructionGroupFromProtocolName(msg.action, true),
        0,
        msg,
        this,
        true,
        msg.requestId
      )
    );
  }

  public receiveClientActionMessage(msg: cf.node.ClientActionMessage) {
    this.execute(
      new ActionExecution(
        msg.action,
        instructionGroupFromProtocolName(msg.action, false),
        0,
        msg,
        this,
        false,
        msg.requestId
      )
    );
  }

  public async execute(execution: ActionExecution) {
    await this.run(execution);

    this.notifyObservers("actionCompleted", {
      type: "notification",
      NotificationType: "actionCompleted",
      data: {
        requestId: execution.requestId,
        name: execution.actionName,
        results: execution.results2,
        clientMessage: execution.clientMessage
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
      this.sendResponse(execution.requestId, cf.node.ResponseStatus.COMPLETED);
    } catch (e) {
      console.error(e);
      this.sendResponse(execution.requestId, cf.node.ResponseStatus.ERROR);
    }
  }

  public sendResponse(requestId: string, status: cf.node.ResponseStatus) {
    this.responseHandler.sendResponse(new cf.node.Response(requestId, status));
  }

  public mutateState(state: cf.channel.StateChannelInfos) {
    Object.assign(this.nodeState.channelStates, state);
  }

  public register(scope: Opcode, method: InstructionMiddlewareCallback) {
    this.middleware.add(scope, method);
  }
}

export interface IntermediateResults {
  outbox?: cf.node.ClientActionMessage;
}

export class Context {
  public results2: OpCodeResult[] = [];
  public intermediateResults: IntermediateResults = {};

  // todo(ldct): the following fields are very special-purpose and only accessed
  // in one place; it would be nice to get rid of them
  public instructionPointer: number = Object.create(null);
  public instructionExecutor: InstructionExecutor = Object.create(null);
}

applyMixins(InstructionExecutor, [Observable]);
