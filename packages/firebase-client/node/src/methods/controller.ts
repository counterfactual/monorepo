import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../request-handler";

export abstract class NodeController {
  public static readonly methodName: Node.MethodName;

  public async executeMethod(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Node.MethodResult> {
    const shardedQueues = await this.enqueueByShard(requestHandler, params);

    let promise;

    const executeCached = async () => {
      if (!promise) {
        promise = this.executeMethodImplementation(requestHandler, params);
      }
      return await promise;
    };

    await this.beforeExecution(requestHandler, params);

    let ret;

    if (shardedQueues.length > 0) {
      for (const queue of shardedQueues) queue.add(executeCached);
      for (const queue of shardedQueues) await queue;
      ret = await promise;
    } else {
      ret = await executeCached();
    }

    await this.afterExecution(requestHandler, params);

    return ret;
  }

  protected abstract executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Node.MethodResult>;

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<void> {}

  protected async afterExecution(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<void> {}

  // This method is the logic by which the waiting on the queue happens
  // per controller which needs to be overrided.
  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Queue[]> {
    // @ts-ignore
    return [];
  }
}
