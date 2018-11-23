import { Node, NodeOptions } from "./node";

export function create(options: NodeOptions) {
  return new Node(options);
}
