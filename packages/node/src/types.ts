import { ProtocolMessage } from "@counterfactual/machine";
import { Address, Node } from "@counterfactual/types";
import Queue from "promise-queue";

import { RequestHandler } from "./request-handler";

export class NodeController {
  // This method deals with the boilerplate of decorating the Node controllers.
  static enqueue(
    target: NodeController,
    propertyName: string,
    propertyDesciptor: PropertyDescriptor
  ) {
    const method = propertyDesciptor.value;

    propertyDesciptor.value = async (
      requestHandler: RequestHandler,
      params: Node.MethodParams
    ) => {
      const shardedQueue = await target.enqueueByShard(requestHandler);
      return await shardedQueue.add<Node.CreateChannelResult>(async () => {
        return await method.apply(this, [requestHandler, params]);
      });
    };
    return propertyDesciptor;
  }

  // This method is the logic by which the waiting on the queue happens
  // per controller which needs to be overrided.
  async enqueueByShard(requestHandler: RequestHandler): Promise<Queue> {
    // Empty implementation
    return Promise.resolve(Object.create(null));
  }
}

export enum QUEUE_SHARD_KEYS {
  CHANNEL_CREATION = "channelCreation"
}

/**
 * The message interface for Nodes to communicate with each other.
 */
export interface NodeMessage {
  from: Address;
  type: NodeEvents;
}

enum Events {
  PROPOSE_INSTALL = "proposeInstallEvent",
  PROPOSE_INSTALL_VIRTUAL = "proposeInstallVirtualEvent",
  PROTOCOL_MESSAGE_EVENT = "protocolMessageEvent",
  WITHDRAW_EVENT = "withdrawEvent",
  INSTALL_VIRTUAL = "installVirtualEvent",
  REJECT_INSTALL_VIRTUAL = "rejectInstallVirtualEvent",
  UNINSTALL_VIRTUAL = "uninstallVirtualEvent"
}

// Because `extend`ing isn't a native enum feature
// https://github.com/Microsoft/TypeScript/issues/17592
// These are events that Nodes and Node consumers can listen on, but not
// cf.js clients as not all Node events are directly relevant to cf.js clients
// for eg: Node consumers are the only relevant party listening on
// `PROPOSE_INSTALL` in order to _create_ a cf.js client (i.e. dApp)
export type NodeEvents = Node.EventName | Events;
export const NODE_EVENTS = {
  ...Node.EventName,
  ...Events
};

export interface NodeMessageWrappedProtocolMessage extends NodeMessage {
  data: ProtocolMessage;
}

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
    proposedByIdentifier: string;
  };
}

export interface InstallMessage extends NodeMessage {
  data: {
    params: Node.InstallParams;
  };
}

export interface InstallVirtualMessage extends NodeMessage {
  // TODO: update this to include the intermediares
  data: {
    params: Node.InstallParams;
  };
}

export interface CreateMultisigMessage extends NodeMessage {
  data: {
    multisigAddress: Address;
    params: Node.CreateChannelParams;
  };
}

export interface UpdateStateMessage extends NodeMessage {
  data: Node.UpdateStateEventData;
}

export interface UninstallMessage extends NodeMessage {
  data: Node.UninstallEventData;
}

export interface WithdrawMessage extends NodeMessage {
  data: Node.WithdrawEventData;
}

export interface RejectProposalMessage extends NodeMessage {
  data: {
    appInstanceId: string;
  };
}

export interface DepositConfirmationMessage extends NodeMessage {
  data: Node.DepositParams;
}

export interface RejectInstallVirtualMessage extends RejectProposalMessage {}
