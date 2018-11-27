import * as cf from "@counterfactual/cf.js";

export default class NodeProvider implements cf.types.INodeProvider {
  public onMessage(callback: (message: cf.types.NodeMessage) => void) {}

  public sendMessage(message: cf.types.NodeMessage) {}
}
