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
  let executionPromise;

  function executeCached() {
    if (!executionPromise) executionPromise = f();
    return executionPromise;
  }

  if (queueList.length > 0) {
    const promiseList: Promise<any>[] = [];
    for (const queue of queueList) promiseList.push(queue.add(executeCached));
    for (const promise of promiseList) await promise;
    return executionPromise;
  }

  return executeCached();
}
