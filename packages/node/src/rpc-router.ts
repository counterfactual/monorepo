import {
  Controller,
  jsonRpcSerializeAsResponse,
  Router,
  Rpc
} from "rpc-server";

import { RequestHandler } from "./request-handler";

type AsyncCallback = (...args: any) => Promise<any>;

export default class NodeRouter extends Router {
  private requestHandler: RequestHandler;
  // private events: { [key: string]: AsyncCallback[] } = {};

  constructor({
    controllers,
    requestHandler
  }: {
    controllers: (typeof Controller)[];
    requestHandler: RequestHandler;
  }) {
    super({ controllers });

    this.requestHandler = requestHandler;
  }

  async dispatch(rpc: Rpc) {
    const controller = Object.values(Controller.rpcMethods).find(
      mapping => mapping.method === rpc.methodName
    );

    if (!controller) {
      console.warn(`Cannot execute ${rpc.methodName}: no controller`);
      return;
    }

    return jsonRpcSerializeAsResponse(
      new controller.type()[controller.callback](
        this.requestHandler,
        rpc.parameters
      ),
      rpc.parameters["id"]
    );
  }

  async subscribe(event: string, callback: AsyncCallback) {
    console.log("[RpcRouter]", `Subscribed ${event}`);
    this.requestHandler.outgoing.on(event, callback);
  }

  async subscribeOnce(event: string, callback: AsyncCallback) {
    console.log("[RpcRouter]", `SubscribedOnce ${event}`);
    this.requestHandler.outgoing.once(event, callback);
  }

  async unsubscribe(event: string, callback?: AsyncCallback) {
    console.log("[RpcRouter]", `Unsubscribed ${event}`);
    this.requestHandler.outgoing.off(event, callback);
  }

  async emit(event: string, params: any) {
    console.log("[RpcRouter]", `Emitted ${event} with`, params);
    this.requestHandler.incoming.emit(event, params);
  }
}
