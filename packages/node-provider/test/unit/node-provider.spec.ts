import NodeProvider from "../../src/node-provider";
import { NodeMessage, NodeMessageType } from "../../src/types";

describe("NodeProvider", () => {
  it("should instantiate", () => {
    new NodeProvider();
  });
  it("should connect", async () => {
    const nodeProvider = new NodeProvider();
    await nodeProvider.connect();
  });
  it("should emit a warning if you're connecting twice", async () => {
    console.warn = jest.fn();

    const nodeProvider = new NodeProvider();
    await nodeProvider.connect();
    await nodeProvider.connect();

    expect(console.warn).toBeCalledWith("NodeProvider is already connected.");
  });
  it("should fail to send a message if not connected", () => {
    const nodeProvider = new NodeProvider();

    expect(() => {
      nodeProvider.emit({
        messageType: NodeMessageType.INSTALL,
        requestId: "0",
        data: null
      });
    }).toThrow(
      "It's not possible to use postMessage() before the NodeProvider is connected. Call the connect() method first."
    );
  });
  it("should listen for messages", done => {
    const nodeProvider = new NodeProvider();

    nodeProvider.onMessage((message: NodeMessage) => {
      if (message.messageType === NodeMessageType.READY) {
        done();
      }
    });


  });
});
