import { NetworkContext } from "@counterfactual/types";
import { Signature } from "ethers/utils";

import { EthereumCommitment } from "./ethereum/utils";
import { StateChannel } from "./models";
import { Opcode } from "./opcodes";
import { ProtocolMessage } from "./protocol-types-tbd";

export enum Protocol {
  Setup = "setup",
  Install = "install",
  Update = "update",
  Uninstall = "uninstall",
  InstallVirtualApp = "install-virtual-app"
}

export type ProtocolExecutionFlow = {
  [x: number]: Instruction[];
};

export type InstructionMiddlewareCallback = {
  (message: ProtocolMessage, next: Function, context: Context): void;
};

interface InstructionMiddleware {
  scope: Opcode;
  method: InstructionMiddlewareCallback;
}

export type Instruction = Function | Opcode;

export type InstructionMiddlewares = { [I in Opcode]: InstructionMiddleware[] };

export interface Context {
  network: NetworkContext;
  outbox: ProtocolMessage[];
  inbox: ProtocolMessage[];
  stateChannel: StateChannel;
  operation?: EthereumCommitment;
  signature?: Signature;
}
