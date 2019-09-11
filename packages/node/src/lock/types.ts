export interface ILockInterface {
  acquireLock(
    lockName: string,
    callback: (...args: any[]) => any,
    timeout: number
  ): Promise<any>;
}
