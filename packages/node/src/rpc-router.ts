import {
  Controller,
  JsonRpcResponse,
  jsonRpcSerializeAsResponse,
  Router,
  Rpc
} from "rpc-server";

import { RequestHandler } from "./request-handler";
import { NODE_EVENTS } from "./types";

type AsyncCallback = (...args: any) => Promise<any>;

export default class RpcRouter extends Router {
  private readonly requestHandler: RequestHandler;

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

  async dispatch(rpc: Rpc): Promise<JsonRpcResponse> {
    const controller = Object.values(Controller.rpcMethods).find(
      mapping => mapping.method === rpc.methodName
    );

    if (!controller) {
      throw Error(`Cannot execute ${rpc.methodName}: no controller`);
    }

    const result = jsonRpcSerializeAsResponse(
      {
        result: await new controller.type()[controller.callback](
          this.requestHandler,
          rpc.parameters
        ),
        type: rpc.methodName
      },
      rpc.id as number
    );

    this.requestHandler.outgoing.emit(
      this.mapRPCMethodNameToFinishedEventName(rpc.methodName),
      result
    );

    return result;
  }

  async subscribe(event: string, callback: AsyncCallback) {
    this.requestHandler.outgoing.on(event, callback);
  }

  async subscribeOnce(event: string, callback: AsyncCallback) {
    this.requestHandler.outgoing.once(event, callback);
  }

  async unsubscribe(event: string, callback?: AsyncCallback) {
    this.requestHandler.outgoing.off(event, callback);
  }

  async emit(event: string, data: any, emitter = "incoming") {
    let eventData = data;

    if (!eventData["jsonrpc"]) {
      // It's a legacy message. Reformat it to JSONRPC.
      eventData = jsonRpcSerializeAsResponse(eventData, Date.now());
    }

    this.requestHandler[emitter].emit(event, eventData.result);
  }

  eventListenerCount(event: string): number {
    return typeof this.requestHandler.outgoing.listenerCount === "function"
      ? this.requestHandler.outgoing.listenerCount(event)
      : 0;
  }

  mapRPCMethodNameToFinishedEventName(methodName: string): string {
    switch (methodName) {
      case "chan_create":
        return "setupFinishedEvent";
      case "chan_deposit":
        return "depositFinishedEvent";
      case "chan_install":
        return "installFinishedEvent";
      case "chan_uninstall":
        return "uninstallFinishedEvent";
      case "chan_installVirtual":
        return "installVirtualFinishedEvent";
      case "chan_uninstallVirtual":
        return "uninstallVirtualFinishedEvent";
      case "chan_withdraw":
        return "withdrawFinishedEvent";
      default:
        throw Error("Type Error: methodName must be of type RPCMethodName");
    }
  }
}
