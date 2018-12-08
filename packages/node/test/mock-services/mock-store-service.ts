import { IStoreService } from "../../src/service-interfaces";

class MockStoreService implements IStoreService {
  get(key: string): Promise<any> {
    return Promise.resolve(true);
  }

  set(key: string, value: any): Promise<any> {
    return Promise.resolve(true);
  }
}

export const MOCK_STORE_SERVICE = new MockStoreService();
