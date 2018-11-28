export function createMockMessageEvent(message, transferables) {
  return {
    data: message,
    ports: transferables,
    type: "message"
  };
}

export function createMockMessageChannel() {
  return {
    port1: createMockMessagePort(),
    port2: createMockMessagePort()
  };
}

class MockMessagePort {
  // These properties are needed to fool TypeScript into believing
  // this is a Transferable type.
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

    context.messageCallbacks.push(callback);
  };
}

export function mockPostMessageFunction(context) {
  return (message, target, transferables) => {
    context.messageCallbacks.forEach(callback => {
      callback(createMockMessageEvent(message, transferables));
    });
  };
}
