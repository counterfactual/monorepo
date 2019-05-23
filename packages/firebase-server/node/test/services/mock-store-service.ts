import { IStoreService } from "../../src/services";

class MockStoreService implements IStoreService {
  get(key: string): Promise<any> {
    return Promise.resolve(true);
  }

  set(pairs: { key: string; value: any }[]): Promise<boolean> {
    return Promise.resolve(true);
  }
}

const mockStoreService = new MockStoreService();
export default mockStoreService;
