import { NodeMessage, NodeProvider } from "./interfaces";

export default class NodeProviderImpl implements NodeProvider {
  public onMessage(callback: (message: NodeMessage) => void) {}

  public postMessage(message: NodeMessage) {}
}
