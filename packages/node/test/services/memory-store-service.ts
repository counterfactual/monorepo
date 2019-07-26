import { Node } from "@counterfactual/types";

export class MemoryStoreService implements Node.IStoreService {
  private store: Map<string, any> = new Map();
  constructor() {}
  async get(key: string): Promise<any> {
    if (
      key.endsWith("channel") ||
      key.endsWith("appInstanceIdToProposedAppInstance")
    ) {
      const nestedRecords = Array.from(this.store.entries()).filter(
        (entry: [string, any]) => {
          return entry[0].includes(key);
        }
      );
      if (nestedRecords.length === 0) {
        return {};
      }

      const results = {};
      nestedRecords.forEach((entry: [string, any]) => {
        const key: string = entry[0].split("/").pop()!;
        if (entry[1] !== null) {
          results[key] = entry[1];
        }
      });

      return results;
    }
    if (this.store.has(key)) {
      return this.store.get(key);
    }
    return Promise.resolve(null);
  }

  async set(pairs: { key: string; value: any }[]): Promise<void> {
    for (const pair of pairs) {
      this.store.set(pair.key, JSON.parse(JSON.stringify(pair.value)));
    }
  }

  async reset() {
    this.store.clear();
  }
}

export class MemoryStoreServiceFactory implements Node.ServiceFactory {
  createStoreService() {
    return new MemoryStoreService();
  }
}
