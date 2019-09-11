import { Node } from "@counterfactual/types";
import Queue from "p-queue";

import { addToManyQueues } from "../../src/methods/queued-execution";
import { MemoryLockService } from "../services/memory-lock-service";

describe("p-queue", () => {
  it("should be possible to mimic onEmpty via inspection of _queue", async () => {
    const q = new Queue({ concurrency: 1 });
    q.add(() => new Promise(r => setTimeout(() => r("abc"), 250)));
    const p = Promise.all(q["queue"]["_queue"]);
    const ret = await q.add(
      () =>
        new Promise(async r => {
          await p;
          r("abc");
        })
    );
    expect(ret).toBe("abc");
  });

  it("should be possible mimic onIdle (for a subset of queue) via dummy promise", async () => {
    const q = new Queue({ concurrency: 1 });
    q.add(() => new Promise(r => setTimeout(() => r("abc"), 250)));
    const p = q.add(() => new Promise(r => r()));
    const ret = await q.add(
      () =>
        new Promise(async r => {
          await p;
          r("abc");
        })
    );
    expect(ret).toBe("abc");
  });
});

describe.only("addToManyQueues", () => {
  let lockService: Node.ILockService;
  beforeEach(() => {
    lockService = new MemoryLockService();
  });

  it("should work with one queue", async () => {
    const ret = await addToManyQueues(
      // @ts-ignore
      "test_method",
      "xpub",
      ["testQueue"],
      [new Queue({ concurrency: 1 })],
      () => new Promise(r => setTimeout(() => r("abc"), 1)),
      lockService
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
    const ret = await addToManyQueues(
      // @ts-ignore
      "test_method",
      "xpub",
      ["testQueue1", "testQueue2"],
      [queue1, queue2],
      () =>
        new Promise(r => {
          noTimesExecutionFunctionRan += 1;
          r("abc");
        }),
      lockService
    );
    expect(ret).toBe("abc");
    expect(noTimesExecutionFunctionRan).toBe(1);
    expect(noTimesQueueBecameActive).toBe(4);
  });

  it("should work with 10 queues", async () => {
    let noTimesExecutionFunctionRan = 0;
    let noTimesQueueBecameActive = 0;
    const queues: Queue[] = [];
    const queueNames: string[] = [];
    for (let i = 0; i < 10; i += 1) {
      queues.push(new Queue({ concurrency: 1 }));
      queueNames.push(`queue${i}`);
    }
    queues.forEach(q => q.on("active", () => (noTimesQueueBecameActive += 1)));
    const ret = await addToManyQueues(
      // @ts-ignore
      "test_method",
      "xpub",
      queueNames,
      queues,
      () =>
        new Promise(r => {
          noTimesExecutionFunctionRan += 1;
          r("abc");
        }),
      lockService
    );
    expect(ret).toBe("abc");
    expect(noTimesExecutionFunctionRan).toBe(1);
    expect(noTimesQueueBecameActive).toBe(20);
  });

  it.skip("should work when called concurrently with one queue", async () => {
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
      } else if (i === 3) {
        console.log(
          "expecting hasExecutionStartedOnFirstOne to be true",
          hasExecutionStartedOnFirstOne
        );
        expect(hasExecutionStartedOnFirstOne).toBe(true);
        expect(hasExecutionFinishedOnFirstOne).toBe(true);
        expect(hasExecutionStartedOnSecondOne).toBe(false);
        expect(hasExecutionFinishedOnSecondOne).toBe(false);
      }
    });

    addToManyQueues(
      // @ts-ignore
      "test_method_1",
      "xpub",
      ["testQueue"],
      [sharedQueue],
      () =>
        new Promise(async r => {
          console.log("pending expect about to run");
          expect(sharedQueue.size).toBe(2);
          console.log("pending expect passed");
          hasExecutionStartedOnFirstOne = true;
          console.log("marking hasExecutionStartedOnFirstOne as true");
          console.log(hasExecutionStartedOnFirstOne);
          await new Promise(r => setTimeout(r, 250));
          expect(hasExecutionStartedOnSecondOne).toBe(false);
          // ensure second promise is added to queue, but not acted on
          // pending promises are those that are already triggered
          // size of queue doesnt necessarily include pending promises
          expect(sharedQueue.pending + sharedQueue.size).toEqual(3);
          hasExecutionFinishedOnFirstOne = true;
          r();
        }),
      lockService
    );

    addToManyQueues(
      // @ts-ignore
      "test_method_2",
      "xpub",
      ["testQueue"],
      [sharedQueue],
      () =>
        new Promise(r => {
          hasExecutionStartedOnSecondOne = true;
          hasExecutionFinishedOnSecondOne = true;
          r();
        }),
      lockService
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

  it.skip("should work when called concurrently with two queues", async () => {
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

    const queueNames = ["testQueue1", "testQueue2"];
    addToManyQueues(
      // @ts-ignore
      "testMethod1",
      "xpub",
      queueNames,
      [queue0, queue1],
      () =>
        new Promise(async r => {
          hasExecutionStartedOnFirstOne = true;
          await new Promise(r => setTimeout(r, 250));
          expect(hasExecutionStartedOnSecondOne).toEqual(false);
          // ensure second promise is added to queue, but not acted on
          // pending promises are those that are already triggered
          // size of queue doesnt necessarily include pending promises
          expect(queue0.pending).toEqual(1);
          expect(queue0.size).toEqual(2);
          expect(queue1.pending).toEqual(1);
          expect(queue1.size).toEqual(2);
          noTimesExecutionFunctionRan[0] += 1;
          hasExecutionFinishedOnFirstOne = true;
          r();
        }),
      lockService
    );

    await addToManyQueues(
      // @ts-ignore
      "testMethod2",
      "xpub",
      queueNames,
      [queue0, queue1],
      () =>
        new Promise(r => {
          expect(noTimesExecutionFunctionRan).toEqual([1, 0]);
          expect(queue0.pending).toEqual(1);
          expect(queue0.size).toEqual(0);
          hasExecutionStartedOnSecondOne = true;
          noTimesExecutionFunctionRan[1] += 1;
          hasExecutionFinishedOnSecondOne = true;
          r();
        }),
      lockService
    );

    await queue0.onIdle();
    await queue1.onIdle();

    expect(noTimesExecutionFunctionRan).toEqual([1, 1]);
    expect(noTimesQueueBecameActive).toEqual([4, 4]);
  });
});
