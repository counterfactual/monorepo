import Queue, { Task } from "p-queue";

import { executeFunctionWithinQueues } from "./methods/queued-execution";

export default class ProcessQueue {
  private readonly queues: Map<string, Queue> = new Map<string, Queue>();

  addTask(queueKeys: string[], task: Task<any>) {
    return executeFunctionWithinQueues(
      queueKeys.map(this.getOrCreateQueue.bind(this)),
      task
    );
  }

  private getOrCreateQueue(queueKey: string): Queue {
    if (!this.queues.has(queueKey)) {
      this.queues.set(queueKey, new Queue({ concurrency: 1 }));
    }
    return this.queues.get(queueKey)!;
  }
}
