import { EthereumGlobal, NodeEthereumResponse } from "../../src/types";

export default class EthereumMock implements EthereumGlobal {
  responseCallbacks: undefined;
  notificationCallbacks: undefined;
  connection: undefined;
  addDefaultEvents: undefined;

  networkVersion: string = "";
  selectedAddress: string = "";

  isMetaMask?: boolean = false;
  host?: string;
  path?: string;

  token?: string;

  constructor(private readonly events: { [key: string]: Function[] } = {}) {}

  async enable() {
    this.selectedAddress = "0x0";
  }

  on(type: string, callback: (...args: any[]) => any): undefined {
    this.events[type] = [...(this.events[type] || []), callback];
    return;
  }

  removeListener(type: string, callback: () => any): undefined {
    this.events[type] = (this.events[type] || []).filter(cb => cb === callback);
    return;
  }

  removeAllListeners(type: string): undefined {
    this.events[type] = [];
    return;
  }

  reset(): undefined {
    return;
  }

  async send(
    eventOrMethod: string
    // data: any[] = []
  ): Promise<NodeEthereumResponse> {
    if (eventOrMethod === "counterfactual:nodeProvider:event") {
      return new Promise(resolve => {
        function relayMessageToDapp(event: any) {
          return resolve(event);
        }
        this.on(eventOrMethod, event => relayMessageToDapp(event));
      });
    }

    return {
      jsonrpc: "2.0",
      result: {}
    } as NodeEthereumResponse;
  }
}
