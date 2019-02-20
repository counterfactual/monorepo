import { Node } from "@counterfactual/types";
import Queue from "promise-queue";

import { RequestHandler } from "../request-handler";

export class NodeController {
  // This method deals with the boilerplate of decorating the Node controllers.
  static enqueue(
    target: NodeController,
    propertyName: string,
    propertyDesciptor: PropertyDescriptor
  ) {
    const method = propertyDesciptor.value;

    propertyDesciptor.value = async (
      requestHandler: RequestHandler,
      params: Node.MethodParams
    ) => {
      const shardedQueue = await target.enqueueByShard(requestHandler, params);
      return await shardedQueue.add<Node.CreateChannelResult>(async () => {
        return await method.apply(this, [requestHandler, params]);
      });
    };
    return propertyDesciptor;
  }

  // This method is the logic by which the waiting on the queue happens
  // per controller which needs to be overrided.
  async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.MethodParams
  ): Promise<Queue> {
    // Empty implementation
    return Promise.resolve(Object.create(null));
  }
}
