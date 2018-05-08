const MockRegistry = artifacts.require("MockRegistry");


contract("MockRegistry", (_accounts) => {
	it ("should resolve to a setLookp address", async() => {
		let reg = await MockRegistry.new();
		reg.setLookup(
			"0x0000000000000000000000000000000000000000000000000000000000000000",
			"0x0000000000000000000000000000000000000001"
		);
		reg.setLookup(
			"0x0000000000000000000000000000000000000000000000000000000000000002",
			"0x0000000000000000000000000000000000000003"
		);
		let zeroLookup = await reg.resolve("0x0000000000000000000000000000000000000000000000000000000000000000");
		let twoLookup = await reg.resolve("0x0000000000000000000000000000000000000000000000000000000000000002");
		assert.equal(zeroLookup, 1);
		assert.equal(twoLookup, 3);
	});
});
