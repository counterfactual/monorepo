import { Node } from "@counterfactual/types";
import Queue, { Task } from "p-queue";

import { addToManyQueues } from "./methods/queued-execution";

export default class ProcessQueue {
  private readonly queues: Map<string, Queue> = new Map<string, Queue>();

  addTask(
    queueKeys: string[],
    task: Task<any>,
    lockService: Node.ILockService
  ) {
    return addToManyQueues(
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
