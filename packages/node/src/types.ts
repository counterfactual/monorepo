import { Address, Node } from "@counterfactual/types";

/**
 * The message interface for Nodes to communicate with each other.
 */
export interface NodeMessage {
  from?: Address;
  event: Node.EventName;
  data: any;
}
