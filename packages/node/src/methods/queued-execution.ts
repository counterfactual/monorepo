import { Node } from "@counterfactual/types";
import Queue, { Task } from "p-queue";

import { Protocol } from "../machine";
import { sleep } from "../utils";

type Lock = Node.Lock;

/**
 * Executes a function call and adds it to one or more promise queues.
 *
 * @export
 * @param {Queue[]} queues - a list of p-queue queues
 * @param {Task<any>} task - any function which returns a promise-like
 * @returns
 */
export async function addToManyQueues(
  protocolOrMethodName: Protocol | Node.RpcMethodName,
  xpub: string,
  queueNames: string[],
  queues: Queue[],
  task: Task<any>,
  lockService: Node.ILockService
) {
  if (queues.length === 0) return await task();

  let promise: PromiseLike<any>;

  const queuesToUnlock: string[] = [];
  /**
   * This promise will get run `n` times for `n` queues (since it
   * will be called in every queue) and so to ensure it only runs
   * once overall we memoize it.
   */
  console.trace();
  async function runTaskWithMemoization() {
    let error;
    let blockingQueue;
    for (let i = 0; i < 5; i += 1) {
      try {
        if (!promise) {
          for (const queueName of queueNames) {
            const lock: Lock = await lockService.get(queueName);
            if (lock.locked) {
              if (
                !operationIsNestedInProtocol(
                  lock.operation,
                  protocolOrMethodName,
                  xpub
                )
              ) {
                blockingQueue = queueName;
                error = `${xpub} can't run task on locked queue ${queueName} for protocol/method ${protocolOrMethodName}`;
                throw Error(error);
              }
              // else it's safe to operate on channel with an already-held lock
              // since the operation is nested within the protocol operating
              // on the channel
            }

            // if an operation is nested within a protocol that already has a
            // lock on the channel, we don't modify the lock
            if (!lock.locked) {
              console.log(
                `${xpub} locking queue ${queueName} for protocol/method ${protocolOrMethodName}`
              );

              await lockService.set(queueName, {
                operation: protocolOrMethodName,
                locked: true
              } as Lock);

              console.log(
                `${xpub} locked queue ${queueName} for protocol/method ${protocolOrMethodName}`
              );
              queuesToUnlock.push(queueName);
            }
          }

          promise = task();
          error = null;
          break;
        }
      } catch (e) {
        console.error(e);
        for (const queueToUnlock of queuesToUnlock) {
          await lockService.set(queueToUnlock, {
            operation: protocolOrMethodName,
            locked: false
          });

          console.log(
            `Failed to get promise for task - ${xpub} unlocked queue ${queueToUnlock} for protocol/method ${protocolOrMethodName}`
          );
        }
        console.log(
          `${xpub} sleeping for 500 before trying ${protocolOrMethodName} on queue ${blockingQueue} to get task promise again for ${i} time...`
        );
        await sleep(500);
      }
    }
    if (!promise) {
      throw Error(error);
    }
    return promise;
  }

  /**
   * Because queue.onIdle() is event-driven, if you were to run
   * `p = queue.onIdle(); queue.add(·);` the `p` variable would
   * include the added task from the next line. So, this approch
   * below adds an instantly-resolving task to the queue and based
   * on the signature of `Queue.add` will return a promise that
   * resolves when the queue effectively becomes idle up-until this
   * point. By wrapping all of this in Promise.all, we effectively
   * create a promise that says "every queue has finished up until
   * the time that addToManyQueues was called".
   */
  const waitForEveryQueueToFinish = Promise.all(
    queues.map(q => q.add(() => {}))
  );

  await Promise.all(
    queues.map(q =>
      /**
       * Since any one of the queues could potentially finish early, we
       * add the `waitForEveryQueueToFinish` promise to all of the added
       * tasks to ensure that we wait for _all_ of them to finish before
       * actually executing the task.
       */
      q.add(() => waitForEveryQueueToFinish.then(runTaskWithMemoization))
    )
  );

  for (const queueToUnlock of queuesToUnlock) {
    await lockService.set(queueToUnlock, {
      operation: protocolOrMethodName,
      locked: false
    });

    console.log(
      `${xpub} unlocked queue ${queueToUnlock} for protocol ${protocolOrMethodName}`
    );
  }

  return await runTaskWithMemoization();
}

function operationIsNestedInProtocol(
  operationOnLock: string,
  operationBeingPerformed: Protocol | Node.RpcMethodName,
  xpub: string
) {
  if (
    operationOnLock === Node.RpcMethodName.DEPOSIT &&
    operationBeingPerformed === Protocol.Install
  ) {
    console.log(
      `${xpub} Performing install balance refund app within the deposit protocol`
    );
    return true;
  }

  if (
    operationOnLock === Node.RpcMethodName.DEPOSIT &&
    operationBeingPerformed === Protocol.Uninstall
  ) {
    console.log(
      `${xpub} Performing uninstall balance refund app within the deposit protocol`
    );
    return true;
  }

  if (
    operationOnLock === Node.RpcMethodName.PROPOSE_INSTALL &&
    operationBeingPerformed === Protocol.Install
  ) {
    console.log(`${xpub} Performing install app within the proposal flow`);
    return true;
  }

  if (
    operationOnLock === Node.RpcMethodName.INSTALL &&
    operationBeingPerformed === Protocol.Install
  ) {
    console.log(
      `${xpub} Performing install protocol in response to counter party initiating install`
    );
    return true;
  }

  if (
    operationOnLock === Node.RpcMethodName.PROPOSE_INSTALL_VIRTUAL &&
    operationBeingPerformed === Protocol.InstallVirtualApp
  ) {
    console.log(
      `${xpub} Performing install virtual protocol in response to counter party proposing install`
    );
  }
  return false;
}
