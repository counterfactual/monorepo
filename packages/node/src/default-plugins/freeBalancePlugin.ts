import { InstallParams, UpdateParams } from "../machine";
import { Node } from "../node";
import { Plugin } from "../plugin";

export class FreeBalancePlugin implements Plugin {
  // register against & listen on node events
  constructor(readonly node: Node) {
    console.log("creating plugin for a new node: ", node.publicIdentifier);
  }

  onProposedInstall(params: InstallParams): boolean {
    return true;
  }

  onProposedNewState(params: UpdateParams): boolean {
    return true;
  }
}
