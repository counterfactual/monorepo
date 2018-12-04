import { ClientActionMessage } from "@counterfactual/cf.js/dist/src/legacy/node";

import { Context } from "../instruction-executor";
import { NextMsgGenerator } from "../middleware/middleware";
import { EthOpGenerator } from "../middleware/protocol-operation";
import { SetupProposer } from "../middleware/state-transition/setup-proposer";
import { Opcode } from "../opcodes";
import { InternalMessage } from "../types";

const swap = (msg: ClientActionMessage) => {
  const from = msg.fromAddress;
  const to = msg.toAddress;
  msg.fromAddress = to;
  msg.toAddress = from;
};

export const SETUP_FLOW = {
  0: [
    (message, context, node) => {
      context.intermediateResults.proposedStateTransition = SetupProposer.propose(
        message
      );
      context.intermediateResults.operation = EthOpGenerator.setup(
        message,
        node,
        context.intermediateResults.proposedStateTransition.state
      );
    },
    Opcode.OP_SIGN,
    (message: InternalMessage, context: Context) => {
      const ret = NextMsgGenerator.generate2(
        message.clientMessage,
        context.intermediateResults.signature!
      );
      context.intermediateResults.outbox.push(ret);
    },
    Opcode.IO_SEND,
    Opcode.IO_WAIT,
    Opcode.OP_SIGN_VALIDATE,
    Opcode.STATE_TRANSITION_COMMIT
  ],
  1: [
    (message: InternalMessage, context: Context, node) => {
      swap(message.clientMessage);

      context.intermediateResults.proposedStateTransition = SetupProposer.propose(
        message
      );
      context.intermediateResults.operation = EthOpGenerator.setup(
        message,
        node,
        context.intermediateResults.proposedStateTransition.state
      );
    },
    Opcode.OP_SIGN_VALIDATE,
    Opcode.OP_SIGN,
    (message: InternalMessage, context: Context) => {
      const ret = NextMsgGenerator.generate2(
        message.clientMessage,
        context.intermediateResults.signature!
      );
      context.intermediateResults.outbox.push(ret);
    },
    Opcode.IO_SEND,
    Opcode.STATE_TRANSITION_COMMIT
  ]
};
