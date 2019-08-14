import { Node } from "@counterfactual/types";

export class MemoryStoreService implements Node.IStoreService {
  private readonly store: Map<string, any> = new Map();
  constructor() {}
  async get(path: string): Promise<any> {
    if (
      path.endsWith("channel") ||
      path.endsWith("appInstanceIdToProposedAppInstance")
    ) {
      const nestedRecords = Array.from(this.store.entries()).filter(
        (entry) => {
          return entry[0].includes(path);
        }
      );
      if (nestedRecords.length === 0) {
        return {};
      }

      const results = {};
      nestedRecords.forEach((entry) => {
        const key: string = entry[0].split("/").pop()!;
        if (entry[1] !== null) {
          results[key] = entry[1];
        }
      });

      return results;
    }
    if (this.store.has(path)) {
      return this.store.get(path);
    }
    return Promise.resolve(null);
  }

  async set(pairs: { path: string; value: any }[]): Promise<void> {
    for (const pair of pairs) {
      this.store.set(pair.path, JSON.parse(JSON.stringify(pair.value)));
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
