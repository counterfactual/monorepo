import { IStoreService } from "../../src";

class MemoryStoreService implements IStoreService {
  private store: Map<string, any> = new Map();
  constructor() {}
  async get(key: string): Promise<any> {
    return this.store.get(key);
  }

  async set(pairs: { key: string; value: any }[]): Promise<boolean> {
    for (const pair of pairs) {
      this.store.set(pair.key, pair.value);
    }
    return true;
  }
}

const MEMORY_STORE_SERVICE = new MemoryStoreService();
export default MEMORY_STORE_SERVICE;
