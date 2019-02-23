import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../request-handler";

export abstract class NodeController {
  public static readonly methodName: Node.MethodName;

  public async executeMethod(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Node.MethodResult> {
    // TODO: Enable per-controller queueing
    // const shardedQueue = await this.enqueueByShard(requestHandler, params);

    const shardedQueue = requestHandler.getShardedQueue("rootQueue");

    const execute = async () => {
      return await this.executeMethodImplementation(requestHandler, params);
    };

    return await (shardedQueue ? shardedQueue.add(execute) : execute());
  }

  protected abstract executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Node.MethodResult>;

  // This method is the logic by which the waiting on the queue happens
  // per controller which needs to be overrided.
  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Queue> {
    return null;
  }
}
