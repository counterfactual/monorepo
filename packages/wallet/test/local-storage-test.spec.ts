import { LocalStorageImpl } from "../src/localStorage";

describe("LocalStorage", async () => {
  it("Can put/get data", async () => {
    const ls = new LocalStorageImpl();
    const data = { some: { deeply: { nested: "value" } } };

    ls.put("key", data);
    expect(ls.get("key")).toEqual(data);
  });
});
