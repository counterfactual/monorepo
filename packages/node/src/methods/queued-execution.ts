import Queue, { Task } from "p-queue";

/**
 * Executes a function call and adds it to one or more promise queues.
 *
 * @export
 * @param {Queue[]} queueList - a list of p-queue queues
 * @param {() => Promise<any>} task - any asyncronous function
 * @returns
 */
export async function executeFunctionWithinQueues(
  queueList: Queue[],
  task: () => Task<any>
) {
  if (queueList.length === 0) return await task();

  let promise: Task<any>;

  function executeCached() {
    if (!promise) promise = task();
    return promise;
  }

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
