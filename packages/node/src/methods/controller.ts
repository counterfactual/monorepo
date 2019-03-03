import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../request-handler";

export abstract class NodeController {
  public static readonly methodName: Node.MethodName;

  public async executeMethod(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Node.MethodResult> {
    const shardedQueue = await this.enqueueByShard(requestHandler, params);

    const context = {};

    const execute = async () => {
      return await this.executeMethodImplementation(
        requestHandler,
        params,
        context
      );
    };

    await this.beforeExecution(requestHandler, params, context);

    const ret = await (shardedQueue ? shardedQueue.add(execute) : execute());

    await this.afterExecution(requestHandler, params, context);

    return ret;
  }

  protected abstract executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.MethodParams,
    context?: object
  ): Promise<Node.MethodResult>;

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.MethodParams,
    context?: object
  ): Promise<void> {}

  protected async afterExecution(
    requestHandler: RequestHandler,
    params: Node.MethodParams,
    context?: object
  ): Promise<void> {}

  // This method is the logic by which the waiting on the queue happens
  // per controller which needs to be overrided.
  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Queue> {
    return null;
  }
}
