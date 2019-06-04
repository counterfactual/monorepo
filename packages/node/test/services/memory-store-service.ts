import { Node } from "@counterfactual/types";

class MemoryStoreService implements Node.IStoreService {
  private store: Map<string, any> = new Map();
  constructor() {}
  async get(key: string): Promise<any> {
    if (this.store.has(key)) {
      return this.store.get(key);
    }
    return Promise.resolve(null);
  }

  async set(pairs: { key: string; value: any }[]): Promise<void> {
    for (const pair of pairs) {
      this.store.set(pair.key, pair.value);
    }
  }
}

const memoryStoreService = new MemoryStoreService();
export default memoryStoreService;
