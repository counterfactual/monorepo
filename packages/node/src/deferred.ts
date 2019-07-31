// Wraps an internal promise and provide public methods to resolve/reject the
// internal promise. The internal promise is also publicly available so it can
// be await-ed on.
export class Deferred<T> {
  private readonly internalPromise: Promise<T>;
  private internalResolve!: (value?: T | PromiseLike<T>) => void;
  private internalReject!: (reason?: any) => void;

  constructor() {
    this.internalPromise = new Promise<T>((resolve, reject) => {
      this.internalResolve = resolve;
      this.internalReject = reject;
    });
  }

  get promise(): Promise<T> {
    return this.internalPromise;
  }

  resolve = (value?: T | PromiseLike<T>): void => {
    this.internalResolve(value);
  };

  reject = (reason?: any): void => {
    this.internalReject(reason);
  };
}
