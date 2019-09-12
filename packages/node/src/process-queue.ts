import { Node } from "@counterfactual/types";
import Queue, { Task } from "p-queue";

import MemoryLockService from "./lock/memory-lock-service";
import { addToManyQueues } from "./methods/queued-execution";

class QueueWithLockingServiceConnection extends Queue {
  constructor(
    private readonly queueName,
    private readonly lockingService: Node.ILockInterface,
    ...args: any[]
  ) {
    super(...args);
  }

  async add(task: Task<any>) {
    return super.add(() =>
      this.lockingService.acquireLock(this.queueName, task, 30_000)
    );
  }
}

export default class ProcessQueue {
  private readonly queues: Map<
    string,
    QueueWithLockingServiceConnection
  > = new Map<string, QueueWithLockingServiceConnection>();

  constructor(
    // NOTE: This hard-codes a LOCAL single lock service in any ProcessQueue,
    // this means it is not acting as a centralized lock service right now; a
    // further implementation should extend this primitive and pass in a global
    // service into this constructor that also implements the interface.
    private readonly lockingService: Node.ILockInterface = new MemoryLockService()
  ) {}

  addTask(queueKeys: string[], task: Task<any>) {
    return addToManyQueues(
      queueKeys.map(this.getOrCreateQueue.bind(this)),
      task
    );
  }

  private getOrCreateQueue(
    queueKey: string
  ): QueueWithLockingServiceConnection {
    if (!this.queues.has(queueKey)) {
      this.queues.set(
        queueKey,
        new QueueWithLockingServiceConnection(queueKey, this.lockingService, {
          concurrency: 1
        })
      );
    }
    return this.queues.get(queueKey)!;
  }
}
