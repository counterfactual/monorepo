import { legacy } from "@counterfactual/cf.js";
import { NetworkContext } from "@counterfactual/types";
import { Signature } from "ethers/utils";

import { EthereumCommitment } from "./ethereum/utils";
import { StateChannel } from "./models";
import { Opcode } from "./opcodes";

export enum Protocol {
  Setup = "setup",
  Install = "install",
  SetState = "set-state",
  Uninstall = "uninstall",
  MetaChannelInstallApp = "metachannel-install-app"
}

export interface InternalMessage {
  actionName: Protocol;
  opCode: Opcode;
  clientMessage: legacy.node.ClientActionMessage;
}

export type InstructionMiddlewareCallback = {
  (message: InternalMessage, next: Function, context: Context);
};

export interface InstructionMiddleware {
  scope: Opcode;
  method: InstructionMiddlewareCallback;
}

export type InstructionMiddlewares = { [I in Opcode]: InstructionMiddleware[] };

export interface Context {
  network: NetworkContext;
  outbox: legacy.node.ClientActionMessage[];
  inbox: legacy.node.ClientActionMessage[];
  proposedStateTransition?: StateChannel;
  operation?: EthereumCommitment;
  signature?: Signature;
}
