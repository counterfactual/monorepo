import { Node } from "@counterfactual/types";

type Lock = Node.Lock;

export class MemoryLockService implements Node.ILockService {
  private readonly locks: Map<string, Lock> = new Map();
  constructor() {}
  async get(path: string): Promise<Lock> {
    if (this.locks.has(path)) {
      return this.locks.get(path)!;
    }
    return {
      operation: "",
      locked: false
    } as Lock;
  }

  async set(path: string, value: Lock): Promise<void> {
    this.locks.set(path, value);
  }
}
