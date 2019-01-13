import { Address, Node } from "@counterfactual/types";

/**
 * The message interface for Nodes to communicate with each other.
 */
export interface NodeMessage {
  from: Address;
  event: NodeEvents;
}

enum InterNodeEvent {
  PROPOSE_INSTALL = "proposeInstallEvent",
  PROPOSE_INSTALL_VIRTUAL = "proposeInstallVirtualEvent"
}

// Because `extend`ing isn't a native enum feature
// https://github.com/Microsoft/TypeScript/issues/17592
export type NodeEvents = Node.EventName | InterNodeEvent;
export const NODE_EVENTS = { ...Node.EventName, ...InterNodeEvent };

export interface ProposeMessage extends NodeMessage {
  data: {
    params: Node.ProposeInstallParams;
    appInstanceId: string;
  };
}

export interface ProposeVirtualMessage extends NodeMessage {
  data: {
    params: Node.ProposeInstallVirtualParams;
    appInstanceId: string;
  };
}

export interface InstallMessage extends NodeMessage {
  data: {
    params: Node.InstallParams;
  };
}

export interface CreateMultisigMessage extends NodeMessage {
  data: {
    multisigAddress: Address;
    params: Node.CreateMultisigParams;
  };
}
