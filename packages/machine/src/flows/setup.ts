import { ClientActionMessage } from "@counterfactual/cf.js/dist/src/legacy/node";

import { Context } from "../instruction-executor";
import { NextMsgGenerator } from "../middleware/middleware";
import { constructSetupOp } from "../middleware/protocol-operation/op-generator";
import { SetupProposer } from "../middleware/state-transition/setup-proposer";
import { Node } from "../node";
import { Opcode } from "../opcodes";
import { InternalMessage } from "../types";

const inlineSwapFromAndToAddresses = (msg: ClientActionMessage) => {
  const from = msg.fromAddress;
  const to = msg.toAddress;
  msg.fromAddress = to;
  msg.toAddress = from;
};

export const SETUP_FLOW = {
  0: [
    (message: InternalMessage, context: Context, node: Node) => {
      const proposal = SetupProposer.propose(message);
      const operation = constructSetupOp(message, node, proposal.state);
      context.proposedStateTransition = proposal;
      context.operation = operation;
    },

    Opcode.OP_SIGN,

    (message: InternalMessage, context: Context) => {
      const signature = context.signature!;
      const ret = NextMsgGenerator.generate2(message.clientMessage, signature);
      context.outbox.push(ret);
    },

    Opcode.IO_SEND,

    Opcode.IO_WAIT,

    Opcode.OP_SIGN_VALIDATE,

    Opcode.STATE_TRANSITION_COMMIT
  ],

  1: [
    (message: InternalMessage, context: Context, node: Node) => {
      inlineSwapFromAndToAddresses(message.clientMessage);
      const proposal = SetupProposer.propose(message);
      const operation = constructSetupOp(message, node, proposal.state);
      context.proposedStateTransition = proposal;
      context.operation = operation;
    },

    Opcode.OP_SIGN_VALIDATE,

    Opcode.OP_SIGN,

    (message: InternalMessage, context: Context) => {
      const signature = context.signature!;
      const ret = NextMsgGenerator.generate2(message.clientMessage, signature);
      context.outbox.push(ret);
    },

    Opcode.IO_SEND,

    Opcode.STATE_TRANSITION_COMMIT
  ]
};
