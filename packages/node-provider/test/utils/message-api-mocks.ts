export interface Context {
  originalAddEventListener: typeof addEventListener;
  messageCallbacks: any[];
  connected: boolean;
  dappPort: MockMessagePort;
  nodeProviderPort: MockMessagePort;
}

export function createMockMessageEvent(
  message: string,
  transferables: MockMessagePort[]
) {
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

export class MockMessagePort {
  // These properties are needed to fool TypeScript into believing
  // this is a Transferable type.
  height: number = 0;
  width: number = 0;

  private onMessageCallback: Function[] = [];
  private onMessageErrorCallback: Function[] = [];

  onMessage(callback: Function) {
    this.onMessageCallback.push(callback);
  }

  onMessageError(callback: Function) {
    this.onMessageErrorCallback.push(callback);
  }

  addEventListener(event: string, callback: Function) {
    if (event === "message") {
      this.onMessage(callback);
    }

    if (event === "messageerror") {
      this.onMessageError(callback);
    }
  }

  postMessage(message: string, transferables: MockMessagePort[]) {
    this.onMessageCallback.forEach(callback =>
      createMockMessageEvent(message, transferables)
    );
  }

  start() {}
  close() {}
}

export function createMockMessagePort() {
  return new MockMessagePort();
}

export function mockAddEventListenerFunction(
  context: Context
): typeof window.addEventListener {
  return (eventName: string, callback: EventListenerOrEventListenerObject) => {
    if (eventName !== "message") {
      context.originalAddEventListener(eventName, callback);
      return;
    }

    context.messageCallbacks.push(callback);
  };
}

export function mockPostMessageFunction(context: Context) {
  return (
    message: string,
    target: string,
    transferables: MockMessagePort[]
  ) => {
    context.messageCallbacks.forEach(callback => {
      callback(createMockMessageEvent(message, transferables));
    });
  };
}
