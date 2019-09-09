import { Node } from "@counterfactual/types";
import Queue from "p-queue";
import { Controller } from "rpc-server";

import { RequestHandler } from "../request-handler";

import { executeFunctionWithinQueues } from "./queued-execution";

export abstract class NodeController extends Controller {
  public static readonly methodName: Node.MethodName;

  public async executeMethod(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Node.MethodResult> {
    await this.beforeExecution(requestHandler, params);

    // const ret = await executeFunctionWithinQueues(
    //   await this.enqueueByShard(requestHandler, params),
    const ret = await requestHandler
      .getShardedQueue("global-queue-temporary")
      .add(() => this.executeMethodImplementation(requestHandler, params));

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
