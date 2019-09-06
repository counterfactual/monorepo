import Queue from "p-queue";

/**
 * Executes a function call and adds it to one or more promise queues.
 *
 * @export
 * @param {Queue[]} queueList - a list of p-queue queues
 * @param {() => Promise<any>} f - any asyncronous function
 * @returns
 */
export async function executeFunctionWithinQueues(
  queueList: Queue[],
  f: () => Promise<any>
) {
  let promise: Promise<any>;

  function executeCached() {
    if (!promise) promise = f();
    return promise;
  }

  if (queueList.length > 0) {
    for (const queue of queueList) queue.add(executeCached);
    for (const queue of queueList) await queue.onIdle();
    return await executeCached();
  }

  return await f();
}
