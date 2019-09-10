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

  const p: Promise<any>[] = [];
  if (queueList.length > 0) {
    for (const queue of queueList) queue.add(executeCached);
    for (const queue of queueList) p.push(queue.onIdle());
    await Promise.all(p);
    return await executeCached();
  }

  return await task();
}
