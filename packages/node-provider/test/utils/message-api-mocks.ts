export function createMockMessageEvent(message, transferables) {
  return {
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
  };
}

export function createMockMessageChannel() {
  return {
    port1: createMockMessagePort(),
    port2: createMockMessagePort()
  };
}

class MockMessagePort {
  // These properties are need to fool TypeScript.
  height: number = 0;
  width: number = 0;

  private onMessageCallback: Function = () => {};
  private onMessageErrorCallback: Function = () => {};

  onMessage(callback: Function) {
    this.onMessageCallback = callback;
    this.onMessageErrorCallback = callback;
  }

  addEventListener(event: string, callback: Function) {
    if (event === "message") {
      this.onMessage(callback);
    }

    if (event === "messageerror") {
      this.onMessageErrorCallback(callback);
    }
  }

  postMessage(message, transferables) {
    this.onMessageCallback(createMockMessageEvent(message, transferables));
  }

  start() {}
  close() {}
}

export function createMockMessagePort() {
  return new MockMessagePort();
}

export function mockAddEventListenerFunction(context) {
  return (eventName, callback) => {
    if (eventName !== "message") {
      context.originalAddEventListener(eventName, callback);
      return;
    }

    context.messageCallback = callback;
  }
}

export function mockPostMessageFunction(context) {
  return (message, target, transferables) => {
    context.messageCallback(createMockMessageEvent(message, transferables));
  };
}
