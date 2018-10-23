import { InMemoryKeyValueStoreImpl } from "../src/localStorage";

describe("LocalStorage", async () => {
  it("Can put/get data", async () => {
    const ls = new InMemoryKeyValueStoreImpl();
    const data = { some: { deeply: { nested: "value" } } };

    ls.put("key", data);
    expect(ls.get("key")).toEqual(data);
  });
});
