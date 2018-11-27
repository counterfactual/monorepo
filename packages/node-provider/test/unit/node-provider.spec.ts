import NodeProvider from "../../src/node-provider";
import { NodeMessageType } from "../../src/types";

const originalAddEventListener = window.addEventListener;
const originalPostMessage = window.postMessage;

describe("NodeProvider", () => {
  beforeAll(() => {
    let messageCallback;
    window.addEventListener = jest.fn((eventName, callback) => {
      if (eventName !== "message") {
        originalAddEventListener(eventName, callback);
        return;
      }

      messageCallback = callback;
    });
    window.postMessage = jest.fn((message, target, transferables) => {
      messageCallback({
        data: message,
        ports: transferables,
        type: "message",
        lastEventId: "0",
        origin: "localhost",
        source: null,
        bubbles: false,
        cancelBubble: false,
        cancelable: false,
        composed: false,
        currentTarget: window,
        defaultPrevented: false,
        eventPhase: 4,
        isTrusted: true,
        returnValue: null,
        srcElement: window.document.body,
        target: window.document.body,
        timeStamp: Date.now(),
        composedPath() {
          return [] as EventTarget[];
        },
        initEvent() {},
        preventDefault() {},
        stopImmediatePropagation() {},
        stopPropagation() {},
        AT_TARGET: 0,
        BUBBLING_PHASE: 1,
        CAPTURING_PHASE: 2,
        NONE: 3
      });
    });
  });
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
      nodeProvider.sendMessage({
        messageType: NodeMessageType.INSTALL,
        requestId: "0",
        data: null
      });
    }).toThrow(
      "It's not possible to use postMessage() before the NodeProvider is connected. Call the connect() method first."
    );
  });
  afterAll(() => {
    window.addEventListener = originalAddEventListener;
    window.postMessage = originalPostMessage;
  });
});
