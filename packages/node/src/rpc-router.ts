import { Controller, Router, Rpc } from "rpc-server";

import { RequestHandler } from "./request-handler";

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

    return new controller.type()[controller.callback](
      this.requestHandler,
      rpc.parameters
    );
  }
}
