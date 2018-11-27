import NodeProvider from "../../src/node-provider";
import {
  NodeMessage,
  NodeMessageType,
  NodeProviderStatus
} from "../../src/types";

describe("NodeProvider", () => {
  it("should instantiate", () => {
    new NodeProvider();
  });
  it("should connect", async () => {
    const nodeProvider = new NodeProvider();
    await nodeProvider.connect();

    expect(nodeProvider.status).toEqual(NodeProviderStatus.CONNECTED);
  });
  it("should post a message", () => {
    const nodeProvider = new NodeProvider();

    nodeProvider.postMessage({
      messageType: NodeMessageType.INSTALL,
      requestId: "0",
      data: null
    });
  });
  it("should always listen for a message by its type", () => {
    const nodeProvider = new NodeProvider();

    nodeProvider.on(NodeMessageType.INSTALL, (message: NodeMessage) => {});
  });
  it("should listen just once for a message by its type", () => {
    const nodeProvider = new NodeProvider();

    nodeProvider.once(NodeMessageType.INSTALL, (message: NodeMessage) => {});
  });
});
