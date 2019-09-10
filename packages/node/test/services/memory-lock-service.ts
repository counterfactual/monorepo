import { Node } from "@counterfactual/types";

export class MemoryLockService implements Node.ILockService {
  private readonly locks: Map<string, boolean> = new Map();
  constructor() {}
  async get(path: string): Promise<boolean> {
    if (this.locks.has(path)) {
      return this.locks.get(path)!;
    }
    return false;
  }

  async set(path: string, value: boolean): Promise<void> {
    this.locks.set(path, value);
  }
}
