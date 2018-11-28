import * as cf from "@counterfactual/cf.js";

export default class NodeProvider implements cf.types.INodeProvider {
  public onMessage(callback: (message: cf.types.Node.Message) => void) {}

  public sendMessage(message: cf.types.Node.Message) {}
}
