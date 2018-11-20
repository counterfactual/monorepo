import { INodeProvider, NodeMessage } from "@counterfactual/node-provider";

export class TestNodeProvider implements INodeProvider {
  public postedMessages: NodeMessage[] = [];
  readonly callbacks: ((message: NodeMessage) => void)[] = [];

  public sendMessageToClient(message: NodeMessage) {
    this.callbacks.forEach(cb => cb(message));
  }

  public onMessage(callback: (message: NodeMessage) => void) {
    this.callbacks.push(callback);
  }

  public postMessage(message: NodeMessage) {
    this.postedMessages.push(message);
  }
}
