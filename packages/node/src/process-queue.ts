import { Node } from "@counterfactual/types";
import Queue, { Task } from "p-queue";

import { addToManyQueues } from "./methods/queued-execution";

class QueueWithLockingServiceConnection extends Queue {
  constructor(
    private readonly queueName,
    private readonly lockingService: Node.ILockService,
    ...args: any[]
  ) {
    super(...args);
  }

  async add(task: Task<any>) {
    return super.add(() =>
      this.lockingService.acquireLock(this.queueName, task, 30_000, task["__name__"])
    );
  }
}

export default class ProcessQueue {
  private readonly queues: Map<
    string,
    QueueWithLockingServiceConnection | Queue
  > = new Map<string, QueueWithLockingServiceConnection | Queue>();

  constructor(private readonly lockingService?: Node.ILockService) {}

  addTask(queueKeys: string[], task: Task<any>, name: string = "") {
    task["__name__"] = name;
    return addToManyQueues(
      queueKeys.map(k => this.getOrCreateQueue(k, name)),
      task
    );
  }

  private getOrCreateQueue(
    queueKey: string,
    name: string
  ): QueueWithLockingServiceConnection | Queue {
    if (!this.queues.has(queueKey)) {
      this.queues.set(
        queueKey,
        this.lockingService
          ? new QueueWithLockingServiceConnection(
              queueKey,
              this.lockingService,
              name,
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
