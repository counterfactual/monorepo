import { IStoreService } from "../../src/services";

class MockStoreService implements IStoreService {
  get(key: string): Promise<any> {
    return Promise.resolve(true);
  }

  set(pairs: { key: string; value: any }[]): Promise<boolean> {
    return Promise.resolve(true);
  }
}

export const MOCK_STORE_SERVICE = new MockStoreService();
