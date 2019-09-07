import Queue from "p-queue";

import { executeFunctionWithinQueues } from "../../src/methods/queued-execution";

describe("executeFunctionWithinQueues", () => {
  it("should work with one queue", async () => {
    const ret = await executeFunctionWithinQueues(
      [new Queue({ concurrency: 1 })],
      () => new Promise(r => setTimeout(() => r("abc"), 1))
    );
    expect(ret).toBe("abc");
  });

  it("should work with two queues", async () => {
    let noTimesExecutionFunctionRan = 0;
    let noTimesQueueBecameActive = 0;
    const queue1 = new Queue({ concurrency: 1 });
    const queue2 = new Queue({ concurrency: 1 });
    queue1.on("active", () => (noTimesQueueBecameActive += 1));
    queue2.on("active", () => (noTimesQueueBecameActive += 1));
    const ret = await executeFunctionWithinQueues(
      [queue1, queue2],
      () =>
        new Promise(r => {
          noTimesExecutionFunctionRan += 1;
          r("abc");
        })
    );
    expect(ret).toBe("abc");
    expect(noTimesExecutionFunctionRan).toBe(1);
    expect(noTimesQueueBecameActive).toBe(2);
  });

  it("should work with 10 queues", async () => {
    let noTimesExecutionFunctionRan = 0;
    let noTimesQueueBecameActive = 0;
    const queues: Queue[] = [];
    for (const i of Array(10)) {
      queues.push(new Queue({ concurrency: 1 }));
    }
    queues.forEach(q => q.on("active", () => (noTimesQueueBecameActive += 1)));
    const ret = await executeFunctionWithinQueues(
      queues,
      () =>
        new Promise(r => {
          noTimesExecutionFunctionRan += 1;
          r("abc");
        })
    );
    expect(ret).toBe("abc");
    expect(noTimesExecutionFunctionRan).toBe(1);
    expect(noTimesQueueBecameActive).toBe(10);
  });

  it("should work when called concurrently with one queue", async () => {
    const sharedQueue = new Queue({ concurrency: 1 });

    let i = 0;
    let hasExecutionStartedOnFirstOne = false;
    let hasExecutionFinishedOnFirstOne = false;
    let hasExecutionStartedOnSecondOne = false;
    let hasExecutionFinishedOnSecondOne = false;

    sharedQueue.on("active", () => {
      i += 1;
      if (i === 1) {
        expect(hasExecutionStartedOnFirstOne).toBe(false);
        expect(hasExecutionFinishedOnFirstOne).toBe(false);
        expect(hasExecutionStartedOnSecondOne).toBe(false);
        expect(hasExecutionFinishedOnSecondOne).toBe(false);
      } else if (i === 2) {
        expect(hasExecutionStartedOnFirstOne).toBe(true);
        expect(hasExecutionFinishedOnFirstOne).toBe(true);
        expect(hasExecutionStartedOnSecondOne).toBe(false);
        expect(hasExecutionFinishedOnSecondOne).toBe(false);
      }
    });

    executeFunctionWithinQueues(
      [sharedQueue],
      () =>
        new Promise(async r => {
          expect(sharedQueue.pending).toBe(1);
          hasExecutionStartedOnFirstOne = true;
          await new Promise(r => setTimeout(r, 250));
          expect(hasExecutionStartedOnSecondOne).toBe(false);
          // ensure second promise is added to queue, but not acted on
          // pending promises are those that are already triggered
          // size of queue doesnt necessarily include pending promises
          expect(sharedQueue.pending + sharedQueue.size).toEqual(2);
          hasExecutionFinishedOnFirstOne = true;
          r();
        })
    );

    executeFunctionWithinQueues(
      [sharedQueue],
      () =>
        new Promise(r => {
          hasExecutionStartedOnSecondOne = true;
          hasExecutionFinishedOnSecondOne = true;
          r();
        })
    );

    // NOTE: onEmpty could also be used, but doesnt guarantee
    // that the work from the queue is completed, just that the
    // queue is empty
    await sharedQueue.onIdle();

    expect(hasExecutionStartedOnFirstOne).toBe(true);
    expect(hasExecutionStartedOnSecondOne).toBe(true);
    expect(hasExecutionFinishedOnFirstOne).toBe(true);
    expect(hasExecutionFinishedOnSecondOne).toBe(true);
    expect(sharedQueue.size).toBe(0);
    expect(sharedQueue.pending).toBe(0);
  });

  it("should work when called concurrently with two queues", async () => {
    ///// Test scoped vars
    const queue0 = new Queue({ concurrency: 1 });
    const queue1 = new Queue({ concurrency: 1 });

    const noTimesExecutionFunctionRan = [0, 0]; // firstfn, secondfn
    const noTimesQueueBecameActive = [0, 0]; // queue0, queue1

    let hasExecutionStartedOnFirstOne = false;
    let hasExecutionFinishedOnFirstOne = false;
    let hasExecutionStartedOnSecondOne = false;
    let hasExecutionFinishedOnSecondOne = false;

    ///// Test helpers
    const assertCompletion = () => {
      const bothBotsActiveOnce =
        noTimesQueueBecameActive[0] === 1 && noTimesQueueBecameActive[1] === 1;
      const bothBotsActiveTwice =
        noTimesQueueBecameActive[0] === 2 && noTimesQueueBecameActive[1] === 2;

      // must account for bot activity, otherwise you will run into race
      // conditions with the `hasStarted` check
      if (
        noTimesExecutionFunctionRan[0] === 0 &&
        noTimesExecutionFunctionRan[1] === 0 &&
        !bothBotsActiveOnce
      ) {
        expect(hasExecutionStartedOnFirstOne).toBe(false);
        expect(hasExecutionFinishedOnFirstOne).toBe(false);
        expect(hasExecutionStartedOnSecondOne).toBe(false);
        expect(hasExecutionFinishedOnSecondOne).toBe(false);
      } else if (
        noTimesExecutionFunctionRan[0] === 1 &&
        noTimesExecutionFunctionRan[1] === 0 &&
        !bothBotsActiveTwice
      ) {
        expect(hasExecutionStartedOnFirstOne).toBe(true);
        expect(hasExecutionFinishedOnFirstOne).toBe(true);
        expect(hasExecutionStartedOnSecondOne).toBe(false);
        expect(hasExecutionFinishedOnSecondOne).toBe(false);
      } else if (
        // this means its out of order, throw an error
        noTimesExecutionFunctionRan[0] === 0 &&
        noTimesExecutionFunctionRan[1] === 1
      ) {
        throw new Error(
          `Seems like the first function was not completed before the second one.. Yikes.`
        );
      }
    };

    ///// Queue Listeners
    queue0.on("active", () => {
      noTimesQueueBecameActive[0] += 1;
      assertCompletion();
    });

    queue1.on("active", () => {
      noTimesQueueBecameActive[1] += 1;
      assertCompletion();
    });

    executeFunctionWithinQueues(
      [queue0, queue1],
      () =>
        new Promise(async r => {
          hasExecutionStartedOnFirstOne = true;
          await new Promise(r => setTimeout(r, 250));
          expect(hasExecutionStartedOnSecondOne).toEqual(false);
          // ensure second promise is added to queue, but not acted on
          // pending promises are those that are already triggered
          // size of queue doesnt necessarily include pending promises
          expect(queue0.pending + queue0.size).toEqual(2);
          expect(queue1.pending + queue1.size).toEqual(2);
          noTimesExecutionFunctionRan[0] += 1;
          hasExecutionFinishedOnFirstOne = true;
          r();
        })
    );

    executeFunctionWithinQueues(
      [queue0, queue1],
      () =>
        new Promise(r => {
          hasExecutionStartedOnSecondOne = true;
          noTimesExecutionFunctionRan[1] += 1;
          hasExecutionFinishedOnSecondOne = true;
          r();
        })
    );

    await queue0.onIdle();
    await queue1.onIdle();

    expect(noTimesExecutionFunctionRan).toEqual([1, 1]);
    expect(noTimesQueueBecameActive).toEqual([2, 2]);
  });
});
