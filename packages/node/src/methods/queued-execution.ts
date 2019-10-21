import Queue, { Task } from "p-queue";

import { Deferred } from "../deferred";

/**
 * Executes a function call and adds it to one or more promise queues.
 *
 * @export
 * @param {Queue[]} queues - a list of p-queue queues
 * @param {Task<any>} task - any function which returns a promise-like
 * @returns
 */
export async function addToManyQueues(queues: Queue[], task: Task<any>) {
  if (queues.length === 0) return await task();

  let promise: PromiseLike<any>;

  /**
   * This promise will get run `n` times for `n` queues (since it
   * will be called in every queue) and so to ensure it only runs
   * once overall we memoize it.
   */
  function runTaskWithMemoization() {
    if (!promise) promise = task();
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
  const deferreds = [...Array(queues.length)].map(() => new Deferred());
  const waitForEveryQueueToFinish = Promise.all(deferreds.map(d => d.promise));

  await Promise.all(
    queues.map((q, i) =>
      /**
       * Since any one of the queues could potentially finish early, we
       * add the `waitForEveryQueueToFinish` promise to all of the added
       * tasks to ensure that we wait for _all_ of them to finish before
       * actually executing the task.
       */
      q.add(() => {
        deferreds[i].resolve();
        return waitForEveryQueueToFinish.then(runTaskWithMemoization);
      })
    )
  );

  return await runTaskWithMemoization();
}
