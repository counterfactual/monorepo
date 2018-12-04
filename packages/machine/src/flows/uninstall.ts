import { ClientActionMessage } from "@counterfactual/cf.js/dist/src/legacy/node";

import { Context } from "../instruction-executor";
import { NextMsgGenerator } from "../middleware/middleware";
import { EthOpGenerator } from "../middleware/protocol-operation";
import { UninstallProposer } from "../middleware/state-transition/uninstall-proposer";
import { Opcode } from "../opcodes";
import { InternalMessage } from "../types";

const swap = (msg: ClientActionMessage) => {
  const from = msg.fromAddress;
  const to = msg.toAddress;
  msg.fromAddress = to;
  msg.toAddress = from;
};

export const UNINSTALL_FLOW = {
  0: [
    (message, context, node) => {
      context.intermediateResults.proposedStateTransition = UninstallProposer.propose(
        message,
        node
      );
      context.intermediateResults.operation = EthOpGenerator.generate(
        message,
        () => {},
        context,
        node
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
    (message, context, node) => {
      swap(message.clientMessage);
      context.intermediateResults.proposedStateTransition = UninstallProposer.propose(
        message,
        node
      );
      context.intermediateResults.operation = EthOpGenerator.generate(
        message,
        () => {},
        context,
        node
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
