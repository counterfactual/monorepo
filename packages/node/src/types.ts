import { Node } from "@counterfactual/types";
import { TransactionReceipt } from "ethers/providers";

import { ProtocolMessage } from "./engine";
import { FinMessage } from "./engine/types";

export type NodeEvents = Node.EventName;
export const NODE_EVENTS = Node.EventName;

export interface NodeMessageWrappedProtocolMessage extends Node.NodeMessage {
  data: ProtocolMessage;
}

export interface NodeMessageWrappedFinMessage extends Node.NodeMessage {
  data: FinMessage;
}

export interface ProposeMessage extends Node.NodeMessage {
  data: {
    params: Node.ProposeInstallParams;
    appInstanceId: string;
  };
}

export interface ProposeVirtualMessage extends Node.NodeMessage {
  data: {
    params: Node.ProposeInstallVirtualParams;
    appInstanceId: string;
    proposedByIdentifier: string;
  };
}

export interface InstallMessage extends Node.NodeMessage {
  data: {
    params: Node.InstallParams;
  };
}

export interface InstallVirtualMessage extends Node.NodeMessage {
  // TODO: update this to include the intermediares
  data: {
    params: Node.InstallParams;
  };
}

export interface CreateChannelMessage extends Node.NodeMessage {
  data: Node.CreateChannelResult;
}

export interface UpdateStateMessage extends Node.NodeMessage {
  data: Node.UpdateStateEventData;
}

export interface UninstallMessage extends Node.NodeMessage {
  data: Node.UninstallEventData;
}

export interface UninstallVirtualMessage extends Node.NodeMessage {
  // TODO: update this to include the intermediares
  data: Node.UninstallVirtualParams;
}

export interface WithdrawMessage extends Node.NodeMessage {
  data: Node.WithdrawEventData;
}

export interface WithdrawConfirmationMessage extends Node.NodeMessage {
  data: {
    txReceipt: TransactionReceipt;
  };
}

export interface RejectProposalMessage extends Node.NodeMessage {
  data: {
    appInstanceId: string;
  };
}

export interface DepositConfirmationMessage extends Node.NodeMessage {
  data: Node.DepositParams;
}

export interface RejectInstallVirtualMessage extends RejectProposalMessage {}
