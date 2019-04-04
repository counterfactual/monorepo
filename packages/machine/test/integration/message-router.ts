import { Opcode } from "../../src";

import { MiniNode } from "./mininode";

/// copied from node
/// see also: https://twitter.com/joseph_silber/status/809176159858655234
class Deferred<T> {
  private internalPromise: Promise<T>;
  private internalResolve!: (value?: T | PromiseLike<T>) => void;
  private internalReject!: (reason?: any) => void;

  constructor() {
    this.internalPromise = new Promise<T>((resolve, reject) => {
      this.internalResolve = resolve;
      this.internalReject = reject;
    });
  }

  get promise(): Promise<T> {
    return this.internalPromise;
  }

  resolve = (value?: T | PromiseLike<T>): void => {
    this.internalResolve(value);
  };

  reject = (reason?: any): void => {
    this.internalReject(reason);
  };
}

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
      throw Error("No toXpub found on message");
    }
    const deferred = this.deferrals.get(toXpub);

    if (deferred === undefined) {
      const toNode = this.nodesMap.get(toXpub);
      if (toNode === undefined) {
        throw Error(`No node with xpub = ${toXpub} found`);
      }
      toNode.dispatchMessage(message);
      return;
    }

    deferred.resolve(message);
  }

  public assertNoPending() {
    if (this.deferrals.size !== 0) {
      throw Error("Pending IO_SEND_AND_WAIT deferrals detected");
    }
  }
}
