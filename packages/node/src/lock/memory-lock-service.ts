import { Lock } from "./lock";
import { ILockInterface } from "./types";

export class MemoryLockService implements ILockInterface {
  public readonly locks: Map<string, Lock> = new Map<string, Lock>();

  async acquireLock(
    lockName: string,
    callback: (...args: any[]) => any,
    timeout: number
  ): Promise<any> {
    return new Promise(
      async (
        resolve: (value?: any) => void,
        reject: (reason?: any) => void
      ) => {
        const lock = this.getOrCreateLock(lockName);

        let retval = null;
        let rejectReason = null;
        let unlockKey = "";

        try {
          unlockKey = await lock.acquireLock(timeout);
          retval = await callback();
        } catch (e) {
          // TODO: check exception... if the lock failed
          rejectReason = e;
        } finally {
          await lock.releaseLock(unlockKey);
        }

        if (rejectReason) reject(rejectReason);
        else resolve(retval);
      }
    );
  }

  private getOrCreateLock(lockName: string) {
    if (!this.locks.has(lockName)) {
      this.locks.set(lockName, new Lock(lockName));
    }
    return this.locks.get(lockName)!;
  }
}

export default MemoryLockService;