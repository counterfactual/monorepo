import Queue, { Task } from "p-queue";

import { ILockInterface } from "./lock/types";
import { addToManyQueues } from "./methods/queued-execution";

class QueueWithLockingServiceConnection extends Queue {
  constructor(
    private readonly queueName,
    private readonly lockingService: ILockInterface,
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
    QueueWithLockingServiceConnection | Queue
  > = new Map<string, QueueWithLockingServiceConnection | Queue>();

  constructor(
    // NOTE: This hard-codes a LOCAL single lock service in any ProcessQueue,
    // this means it is not acting as a centralized lock service right now; a
    // further implementation should extend this primitive and pass in a global
    // service into this constructor that also implements the interface.
    private readonly lockingService?: ILockInterface
  ) {}

  addTask(queueKeys: string[], task: Task<any>) {
    return addToManyQueues(
      queueKeys.map(this.getOrCreateQueue.bind(this)),
      task
    );
  }

  private getOrCreateQueue(
    queueKey: string
  ): QueueWithLockingServiceConnection | Queue {
    if (!this.queues.has(queueKey)) {
      this.queues.set(
        queueKey,
        this.lockingService
          ? new QueueWithLockingServiceConnection(
              queueKey,
              this.lockingService,
              {
                concurrency: 1
              }
            )
          : new Queue({ concurrency: 1 })
      );
    }
    return this.queues.get(queueKey)!;
  }
}
