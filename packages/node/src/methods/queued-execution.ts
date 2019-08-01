import Queue from "p-queue";

/**
 * Executes a function call and adds it to one or more promise queues.
 *
 * @export
 * @param {Queue[]} queues - a list of p-queue queues
 * @param {() => Promise<any>} f - any asyncronous function
 * @returns
 */
export async function executeFunctionWithinQueues(
  queues: Queue[],
  f: () => Promise<any>
) {
  let promise;

  const executeCached = async () => {
    if (!promise) promise = f();
    return await promise;
  };

  if (queues.length > 0) {
    for (const queue of queues) queue.add(executeCached);
    for (const queue of queues) await queue;
    return await promise;
  }

  return await executeCached();
}
