import { Node } from "@counterfactual/types";
import Queue, { Task } from "p-queue";

import { addToManyQueues } from "./methods/queued-execution";

class QueueWithLockingServiceConnection extends Queue {
  constructor(
    private readonly lockName,
    private readonly lockingService: Node.ILockService,
    ...args: any[]
  ) {
    super(...args);
  }

  async add(task: Task<any>) {
    return super.add(() =>
      this.lockingService.acquireLock(this.lockName, task, 30_000)
    );
  }
}

export default class ProcessQueue {
  private readonly queues: Map<
    string,
    QueueWithLockingServiceConnection | Queue
  > = new Map<string, QueueWithLockingServiceConnection | Queue>();

  constructor(private readonly lockingService?: Node.ILockService) {}

  addTask(lockNames: string[], task: Task<any>) {
    return addToManyQueues(
      lockNames.map(this.getOrCreateLockQueue.bind(this)),
      task
    );
  }

  private getOrCreateLockQueue(
    lockName: string
  ): QueueWithLockingServiceConnection | Queue {
    if (!this.queues.has(lockName)) {
      this.queues.set(
        lockName,
        this.lockingService
          ? new QueueWithLockingServiceConnection(
              lockName,
              this.lockingService,
              {
                concurrency: 1
              }
            )
          : new Queue({ concurrency: 1 })
      );
    }
    return this.queues.get(lockName)!;
  }
}
