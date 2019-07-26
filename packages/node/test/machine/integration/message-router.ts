import { Deferred } from "../../../src/deferred";
import { Opcode } from "../../../src/machine";

import { MiniNode } from "./mininode";

export class MessageRouter {
  private nodesMap: Map<string, MiniNode>;
  private deferrals: Map<string, Deferred<any>>;

  constructor(nodes: MiniNode[]) {
    this.nodesMap = new Map<string, MiniNode>();
    this.deferrals = new Map<string, Deferred<any>>();

    for (const node of nodes) {
      this.nodesMap.set(node.xpub, node);

      node.ie.register(Opcode.IO_SEND, (args: [any]) => {
        const [message] = args;
        this.routeMessage(message);
      });
      node.ie.register(Opcode.IO_SEND_AND_WAIT, async (args: [any]) => {
        const [message] = args;
        message.fromXpub = node.xpub;

        this.deferrals.set(node.xpub, new Deferred());
        this.routeMessage(message);
        const ret = await this.deferrals.get(node.xpub)!.promise;
        this.deferrals.delete(node.xpub);

        return ret;
      });
    }
  }

  private routeMessage(message: any) {
    const { toXpub } = message;
    if (toXpub === undefined) {
      throw new Error("No toXpub found on message");
    }
    const deferred = this.deferrals.get(toXpub);

    if (deferred === undefined) {
      const toNode = this.nodesMap.get(toXpub);
      if (toNode === undefined) {
        throw new Error(`No node with xpub = ${toXpub} found`);
      }
      toNode.dispatchMessage(message);
      return;
    }

    deferred.resolve(message);
  }

  public assertNoPending() {
    if (this.deferrals.size !== 0) {
      throw new Error("Pending IO_SEND_AND_WAIT deferrals detected");
    }
  }
}
