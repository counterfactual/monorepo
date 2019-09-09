import Queue, { Task } from "p-queue";

/**
 * Executes a function call and adds it to one or more promise queues.
 *
 * @export
 * @param {Queue[]} queueList - a list of p-queue queues
 * @param {Task} f - any asyncronous function
 * @returns
 */
export async function executeFunctionWithinQueues(
  queueList: Queue[],
  task: Task<any>
) {
  let promise: Promise<any>;

  function executeCached() {
    if (!promise) promise = task();
    return promise;
  }

  if (queueList.length > 0) {
    const waitForEveryQueueToFinish = Promise.all(
      queueList.map(q => q.add(() => {}))
    );

    await Promise.all(
      queueList.map(q =>
        q.add(() => waitForEveryQueueToFinish.then(executeCached))
      )
    );

    return await executeCached();
  }

  return await task();
}
