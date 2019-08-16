import { Node } from "@counterfactual/types";
import { jsonRpcDeserialize } from "rpc-server";

import NodeProvider from "../../src/node-provider";
import {
  Context,
  createMockMessageChannel,
  mockAddEventListenerFunction,
  MockMessagePort,
  mockPostMessageFunction
} from "../utils/message-api-mocks";

const originalAddEventListener = window.addEventListener;
const originalPostMessage = window.postMessage;

const context = {
  originalAddEventListener,
  messageCallbacks: [],
  connected: false,
  dappPort: new MockMessagePort(),
  nodeProviderPort: new MockMessagePort()
} as Context;

describe("NodeProvider", () => {
  beforeAll(() => {
    window.addEventListener = mockAddEventListenerFunction(context);
    window.postMessage = mockPostMessageFunction(context);

    window.addEventListener("message", event => {
      if (event.data === "cf-node-provider:init") {
        const { port1, port2 } = createMockMessageChannel();
        context.dappPort = port1;
        context.nodeProviderPort = port2;
        window.postMessage("cf-node-provider:port", "*", [port2]);
      }

      if (event.data === "cf-node-provider:ready") {
        context.connected = true;
      }
    });
  });
  beforeEach(() => {
    context.connected = false;
    context.dappPort = new MockMessagePort();
    context.nodeProviderPort = new MockMessagePort();
  });
  it("should instantiate", () => {
    new NodeProvider();
  });
  it("should connect", async () => {
    const nodeProvider = new NodeProvider();
    await nodeProvider.connect();

    expect(context.connected).toBe(true);
  });
  it("should emit a warning if you're connecting twice", async () => {
    const originalConsoleWarn = console.warn;
    console.warn = jest.fn();

    const nodeProvider = new NodeProvider();
    await nodeProvider.connect();
    await nodeProvider.connect();

    expect(console.warn).toBeCalledWith("NodeProvider is already connected.");
    console.warn = originalConsoleWarn;
  });
  it("should fail to send a message if not connected", () => {
    const nodeProvider = new NodeProvider();

    expect(() => {
      nodeProvider.sendMessage(
        jsonRpcDeserialize({
          jsonrpc: "2.0",
          method: Node.RpcMethodName.INSTALL,
          id: new Date().valueOf()
        })
      );
    }).toThrow(
      "It's not possible to use postMessage() before the NodeProvider is connected. Call the connect() method first."
    );
  });
  it("should send a message", async () => {
    const nodeProvider = new NodeProvider();
    await nodeProvider.connect();

    const messageToSend = jsonRpcDeserialize({
      jsonrpc: "2.0",
      method: Node.RpcMethodName.INSTALL,
      id: new Date().valueOf()
    });

    const port = context.nodeProviderPort as MockMessagePort;
    const spyPortPostMessage = jest.spyOn(port, "postMessage");

    nodeProvider.sendMessage(messageToSend);
    expect(spyPortPostMessage).toBeCalledWith(messageToSend);
  });
  afterAll(() => {
    window.addEventListener = originalAddEventListener;
    window.postMessage = originalPostMessage;
  });
});
