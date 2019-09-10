import { Node } from "@counterfactual/types";

export class MemoryLockService implements Node.ILockService {
  private readonly locks: Map<string, JSON> = new Map();
  constructor() {}
  async get(path: string): Promise<JSON> {
    if (this.locks.has(path)) {
      return this.locks.get(path)!;
    }
    throw Error(`No lock exists for path: ${path}`);
  }

  async set(path: string, value: JSON): Promise<void> {
    this.locks.set(path, value);
  }
}
