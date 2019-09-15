import ProcessQueue from "../../src/process-queue";

describe("ProcessQueue", () => {
  it("should be able to process a single task", async () => {
    const processQueue = new ProcessQueue();
    const ret = await processQueue.addTask(["queue1"], () => "abc");
    expect(ret).toBe("abc");
  });

  it("should be able to process two syncronous tasks", async () => {
    const processQueue = new ProcessQueue();
    let i = 0;
    const ret1 = await processQueue.addTask(["queue1"], () => (i += 1));
    const ret2 = await processQueue.addTask(["queue1"], () => (i += 1));
    expect(ret1).toBe(1);
    expect(ret2).toBe(2);
  });

  it("should be able to process two asyncronous tasks, one queue (same)", async () => {
    const processQueue = new ProcessQueue();
    let i = 0;
    let ret1;
    let ret2;
    await Promise.all([
      processQueue.addTask(["queue1"], () => (ret1 = i += 1)),
      processQueue.addTask(["queue1"], () => (ret2 = i += 1))
    ]);
    expect(ret1).toBe(1);
    expect(ret2).toBe(2);
  });

  it("should be able to process two asyncronous tasks, one queue (mixed)", async () => {
    const processQueue = new ProcessQueue();
    let i = 0;
    let ret1;
    let ret2;
    await Promise.all([
      processQueue.addTask(["queue1"], () => (ret1 = i += 1)),
      processQueue.addTask(["queue2"], () => (ret2 = i += 1))
    ]);
    expect(ret1).toBe(1);
    expect(ret2).toBe(2);
  });

  it("should be able to process two asyncronous tasks, two queues (same)", async () => {
    const processQueue = new ProcessQueue();
    let i = 0;
    let ret1;
    let ret2;
    await Promise.all([
      processQueue.addTask(["queue1", "queue2"], () => (ret1 = i += 1)),
      processQueue.addTask(["queue1", "queue2"], () => (ret2 = i += 1))
    ]);
    expect(ret1).toBe(1);
    expect(ret2).toBe(2);
  });

  it("should be able to process two asyncronous tasks, two queues (mixed)", async () => {
    const processQueue = new ProcessQueue();
    let i = 0;
    let ret1;
    let ret2;
    await Promise.all([
      processQueue.addTask(["queue1", "queue3"], () => (ret1 = i += 1)),
      processQueue.addTask(["queue1", "queue2"], () => (ret2 = i += 1))
    ]);
    expect(ret1).toBe(1);
    expect(ret2).toBe(2);
  });
});
