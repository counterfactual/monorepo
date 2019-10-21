import { Node } from "@counterfactual/types";
import { Controller } from "rpc-server";

import { RequestHandler } from "../request-handler";

export abstract class NodeController extends Controller {
  public static readonly methodName: Node.MethodName;

  public async executeMethod(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Node.MethodResult> {
    await this.beforeExecution(requestHandler, params);

    const lockNames = await this.getRequiredLockNames(requestHandler, params);

    const createExecutionPromise = () =>
      this.executeMethodImplementation(requestHandler, params);

    const ret = await requestHandler.processQueue.addTask(
      lockNames,
      createExecutionPromise
    );

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

  protected async getRequiredLockNames(
    // @ts-ignore
    requestHandler: RequestHandler,
    // @ts-ignore
    params: Node.MethodParams
  ): Promise<string[]> {
    return [];
  }
}
