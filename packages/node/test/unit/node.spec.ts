import Node from "../../src/node";

describe("Primitive Node operations", () => {
  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", () => {
    const node = new Node();
    expect(node).toBeDefined();
  });
});
