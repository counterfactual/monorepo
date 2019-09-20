import { Deferred } from "../../../src/deferred";
import { Opcode } from "../../../src/machine";

import { MiniNode } from "./mininode";

export class MessageRouter {
  // mapping from a mininode's xpub to the mininode
  private readonly nodesMap: Map<string, MiniNode>;

  // mapping from a mininode's xpub to a promise representing the future value
  // of an IO_SEND_AND_WAIT call. It is expected that the protocol is awaiting
  // on this promise.
  private readonly deferrals: Map<string, Deferred<any>>;

  // when a message from a mininode causes a protocol to run in another node,
  // a promise representing completion of the second protocol is added here.
  private readonly pendingPromises: Set<Promise<void>>;

  constructor(nodes: MiniNode[]) {
    this.nodesMap = new Map();
    this.deferrals = new Map();
    this.pendingPromises = new Set();

    for (const node of nodes) {
      this.nodesMap.set(node.xpub, node);

      node.engine.register(Opcode.IO_SEND, (args: [any]) => {
        const [message] = args;
        this.appendToPendingPromisesIfNotNull(this.routeMessage(message));
      });
      node.engine.register(Opcode.IO_SEND_AND_WAIT, async (args: [any]) => {
        const [message] = args;
        message.fromXpub = node.xpub;

        this.deferrals.set(node.xpub, new Deferred());
        this.appendToPendingPromisesIfNotNull(this.routeMessage(message));
        const ret = await this.deferrals.get(node.xpub)!.promise;
        this.deferrals.delete(node.xpub);

        return ret;
      });
    }
  }

  private appendToPendingPromisesIfNotNull(v: Promise<void> | null) {
    if (v === null) return;
    this.pendingPromises.add(v);
  }

  private routeMessage(message: any) {
    const { toXpub } = message;
    if (toXpub === undefined) {
      throw Error("No toXpub found on message");
    }
    const deferred = this.deferrals.get(toXpub);

    if (deferred === undefined) {
      const toNode = this.nodesMap.get(toXpub);
      if (toNode === undefined) {
        throw Error(`No node with xpub = ${toXpub} found`);
      }

      // This returns a promise that resolves when runProtocolWithMessage
      // finishes
      return toNode.dispatchMessage(message);
    }

    deferred.resolve(message);
    return null;
  }

  public async waitForAllPendingPromises() {
    await Promise.all(this.pendingPromises);
    if (this.deferrals.size !== 0) {
      throw Error("Pending IO_SEND_AND_WAIT deferrals detected");
    }
  }
}
