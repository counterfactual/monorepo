import { ClientActionMessage } from "@counterfactual/cf.js/dist/src/legacy/node";

import { Context } from "../instruction-executor";
import { NextMsgGenerator } from "../middleware/middleware";
import { EthOpGenerator } from "../middleware/protocol-operation";
import { InstallProposer } from "../middleware/state-transition/install-proposer";
import { Opcode } from "../opcodes";
import { InternalMessage } from "../types";

const swap = (msg: ClientActionMessage) => {
  const from = msg.fromAddress;
  const to = msg.toAddress;
  msg.fromAddress = to;
  msg.toAddress = from;
};

export const INSTALL_FLOW = {
  0: [
    (message, context: Context, node) => {
      context.intermediateResults.proposedStateTransition = InstallProposer.propose(
        message,
        context,
        node
      );
      context.intermediateResults.operation = EthOpGenerator.install(
        message,
        context,
        node,
        context.intermediateResults.proposedStateTransition.state,
        context.intermediateResults.proposedStateTransition.cfAddr!
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
    (message, context: Context, node) => {
      swap(message.clientMessage);
      context.intermediateResults.proposedStateTransition = InstallProposer.propose(
        message,
        context,
        node
      );
      context.intermediateResults.operation = EthOpGenerator.install(
        message,
        context,
        node,
        context.intermediateResults.proposedStateTransition.state,
        context.intermediateResults.proposedStateTransition.cfAddr!
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
