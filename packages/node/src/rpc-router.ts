import {
  Controller,
  jsonRpcSerializeAsResponse,
  Router,
  Rpc
} from "rpc-server";

import { RequestHandler } from "./request-handler";

type AsyncCallback = (...args: any) => Promise<any>;

const callbackWithRequestHandler = (
  requestHandler: RequestHandler,
  callback: AsyncCallback
) => async (...args: any[]) => {
  console.log("Executing", callback.name, " with ", ...args);
  await callback(requestHandler, ...args);
};

export default class NodeRouter extends Router {
  private requestHandler: RequestHandler;

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
      await new controller.type()[controller.callback](
        this.requestHandler,
        rpc.parameters
      ),
      rpc.parameters["id"]
    );
  }

  async subscribe(
    event: string,
    callback: AsyncCallback,
    mode: "public" | "private" = "public"
  ) {
    if (!callback) {
      return;
    }

    console.log("[RpcRouter]", `Subscribed ${event}`);
    this.requestHandler.outgoing.on(
      event,
      mode === "public"
        ? callback
        : callbackWithRequestHandler(this.requestHandler, callback)
    );
  }

  async subscribeOnce(
    event: string,
    callback: AsyncCallback,
    mode: "public" | "private" = "public"
  ) {
    if (!callback) {
      return;
    }

    console.log("[RpcRouter]", `SubscribedOnce ${event}`);
    this.requestHandler.outgoing.once(
      event,
      mode === "public"
        ? callback
        : callbackWithRequestHandler(this.requestHandler, callback)
    );
  }

  async unsubscribe(event: string, callback?: AsyncCallback) {
    console.log("[RpcRouter]", `Unsubscribed ${event}`);
    if (callback) {
      this.requestHandler.outgoing.off(
        event,
        callbackWithRequestHandler(this.requestHandler, callback)
      );
      this.requestHandler.outgoing.off(event, callback);
    } else {
      this.requestHandler.outgoing.off(event);
    }
  }

  async emit(event: string, data: any, emitter = "incoming") {
    let eventData = data;

    // console.log("[RpcRouter]", `Attempting to emit ${event} with`, eventData);

    if (!eventData.jsonrpc) {
      // It's a legacy message. Reformat it to JSONRPC.
      eventData = jsonRpcSerializeAsResponse(eventData, Date.now());
    }

    console.log(
      "[RpcRouter]",
      `Emitted ${event} as ${emitter} with ${JSON.stringify(
        eventData.result
      )} from\n${(new Error().stack as string)
        .split("\n")
        .slice(1)
        .map(l => l.substr(6))
        .join("\n")}`
    );

    this.requestHandler[emitter].emit(event, eventData.result);
  }
}
