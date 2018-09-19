import { LocalStorageImpl } from "./wallet/localStorage";

describe("LocalStorage", async () => {
	it("Can put/get data", async () => {
		let ls = new LocalStorageImpl();
		let data = { some: { deeply: { nested: "value" } } };

		ls.put("key", data);
		expect(ls.get("key")).toEqual(data);
	});
});
