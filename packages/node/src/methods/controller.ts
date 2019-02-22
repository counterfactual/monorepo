import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { RequestHandler } from "../request-handler";

export abstract class NodeController {
  public static readonly methodName: Node.MethodName;

  public async executeMethod(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Node.MethodResult> {
    // const shardedQueue = await this.enqueueByShard(requestHandler, params);

    const shardedQueue = requestHandler.getShardedQueue("rootQueue");

    const execute = async () => {
      console.log(`----------------- beofre node method -------------------`);
      console.log(
        JSON.stringify(
          Object.values(await requestHandler.store.getAllChannels()).map(x => [
            x.multisigAddress,
            x.numInstalledApps
          ]),
          null,
          2
        )
      );
      return await this.executeMethodImplementation(requestHandler, params);
    };

    console.log(`adding method to the queue now`);

    const ret = await (shardedQueue ? shardedQueue.add(execute) : execute());

    console.log(`----------------- after node method -------------------`);
    console.log(
      JSON.stringify(
        Object.values(await requestHandler.store.getAllChannels()).map(x => [
          x.multisigAddress,
          x.numInstalledApps
        ]),
        null,
        2
      )
    );

    return ret;
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
