import Queue from "p-queue";
import uuid from "uuid";

import { Deferred } from "../deferred";

export class Lock {
  private currentLockHandle: Deferred<any> | null = new Deferred();
  private unlockKey: string = "";
  private readonly requestsForLock: Queue;

  constructor(public readonly lockName: string) {
    this.requestsForLock = new Queue({ concurrency: 1 });
  }

  async acquireLock(timeout: number): Promise<string> {
    const unlockKey = uuid.v1();
    const lockAvailableNow = this.requestsForLock.add(() => {});
    this.requestsForLock.add(() =>
      this.acquireLockInternal(unlockKey, timeout)
    );
    await lockAvailableNow;
    return unlockKey;
  }

  async releaseLock(unlockKey: string) {
    this.verifyLockKey(unlockKey);
    if (this.currentLockHandle) this.currentLockHandle.resolve();
    this.currentLockHandle = null;
  }

  public isAqcuired() {
    return this.currentLockHandle !== null;
  }

  private acquireLockInternal(
    unlockKey: string,
    timeout: number
  ): Promise<any> {
    const claim = new Deferred();
    this.currentLockHandle = claim;
    this.unlockKey = unlockKey;
    setTimeout(() => claim.reject("Request timed out."), timeout);
    return claim.promise;
  }

  private verifyLockKey(unlockKey: string) {
    if (unlockKey !== this.unlockKey) {
      throw new Error(
        `Attempted to unlock ${this.lockName} with invalid key: ${unlockKey}`
      );
    }
  }
}
