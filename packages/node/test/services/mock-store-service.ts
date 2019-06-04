import { Node } from "@counterfactual/types";

class MockStoreService implements Node.IStoreService {
  get(key: string): Promise<any> {
    return Promise.resolve(true);
  }

  set(pairs: { key: string; value: any }[]): Promise<void> {
    return Promise.resolve();
  }
}

const mockStoreService = new MockStoreService();
export default mockStoreService;
