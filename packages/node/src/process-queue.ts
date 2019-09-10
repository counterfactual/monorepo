import { Node } from "@counterfactual/types";
import Queue, { Task } from "p-queue";

import { Protocol } from "./machine";
import { addToManyQueues } from "./methods/queued-execution";

export default class ProcessQueue {
  private readonly queues: Map<string, Queue> = new Map<string, Queue>();

  addTask(
    protocolOrMethodName: Protocol | Node.RpcMethodName,
    xpub: string,
    queueKeys: string[],
    task: Task<any>,
    lockService: Node.ILockService
  ) {
    return addToManyQueues(
      protocolOrMethodName,
      xpub,
      queueKeys,
      queueKeys.map(this.getOrCreateQueue.bind(this)),
      task,
      lockService
    );
  }

  private getOrCreateQueue(queueKey: string): Queue {
    if (!this.queues.has(queueKey)) {
      this.queues.set(queueKey, new Queue({ concurrency: 1 }));
    }
    return this.queues.get(queueKey)!;
  }
}
