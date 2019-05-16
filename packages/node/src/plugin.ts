import { InstallParams, UpdateParams } from "./machine";
import { Node } from "./node";

export abstract class Plugin {
  constructor(node: Node) {}
  abstract onProposedInstall(params: InstallParams): boolean;
  abstract onProposedNewState(params: UpdateParams): boolean;
}
