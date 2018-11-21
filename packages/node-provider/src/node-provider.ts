import { INodeProvider, NodeMessage } from "./types";

export default class NodeProvider implements INodeProvider {
  public onMessage(callback: (message: NodeMessage) => void) {}

  public postMessage(message: NodeMessage) {}
}
