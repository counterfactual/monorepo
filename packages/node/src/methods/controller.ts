import { Node } from "@counterfactual/types";
import Queue from "p-queue";
import { Controller } from "rpc-server";

import { RequestHandler } from "../request-handler";

export abstract class NodeController extends Controller {
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
    // @ts-ignore
    requestHandler: RequestHandler,
    // @ts-ignore
    params: Node.MethodParams
  ): Promise<void> {}

  protected async afterExecution(
    // @ts-ignore
    requestHandler: RequestHandler,
    // @ts-ignore
    params: Node.MethodParams
  ): Promise<void> {}

  protected async enqueueByShard(
    // @ts-ignore
    requestHandler: RequestHandler,
    // @ts-ignore
    params: Node.MethodParams
  ): Promise<Queue[]> {
    return [];
  }
}
