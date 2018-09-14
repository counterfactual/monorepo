import { LocalStorageInterface } from './wallet/localStorageInterface';

describe("LocalStorageInterface", async () => {
	it("Can put/get data", async () => {
    let lsi = new LocalStorageInterface();
    let data = { some: { deeply: { nested: 'value' } } };
    
    lsi.put('key', data);
	  expect(lsi.get('key')).toEqual(data);
  });
});