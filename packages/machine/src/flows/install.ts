import { legacy } from "@counterfactual/cf.js";

import { Context } from "../instruction-executor";
import { NextMsgGenerator } from "../middleware/middleware";
import { constructInstallOp } from "../middleware/protocol-operation/op-generator";
import { InstallProposer } from "../middleware/state-transition/install-proposer";
import { Opcode } from "../opcodes";
import { InternalMessage } from "../types";

const swap = (msg: legacy.node.ClientActionMessage) => {
  const from = msg.fromAddress;
  const to = msg.toAddress;
  msg.fromAddress = to;
  msg.toAddress = from;
};

export const INSTALL_FLOW = {
  0: [
    (message, context: Context, node) => {
      context.proposedStateTransition = InstallProposer.propose(
        message,
        context,
        node
      );
      context.operation = constructInstallOp(
        message,
        context,
        node,
        context.proposedStateTransition.state,
        context.proposedStateTransition.cfAddr!
      );
    },
    Opcode.OP_SIGN,
    (message: InternalMessage, context: Context) => {
      const ret = NextMsgGenerator.generate2(
        message.clientMessage,
        context.signature!
      );
      context.outbox.push(ret);
    },
    Opcode.IO_SEND,
    Opcode.IO_WAIT,
    Opcode.OP_SIGN_VALIDATE,
    Opcode.STATE_TRANSITION_COMMIT
  ],
  1: [
    (message, context: Context, node) => {
      swap(message.clientMessage);
      context.proposedStateTransition = InstallProposer.propose(
        message,
        context,
        node
      );
      context.operation = constructInstallOp(
        message,
        context,
        node,
        context.proposedStateTransition.state,
        context.proposedStateTransition.cfAddr!
      );
    },
    Opcode.OP_SIGN_VALIDATE,
    Opcode.OP_SIGN,
    (message: InternalMessage, context: Context) => {
      const ret = NextMsgGenerator.generate2(
        message.clientMessage,
        context.signature!
      );
      context.outbox.push(ret);
    },
    Opcode.IO_SEND,
    Opcode.STATE_TRANSITION_COMMIT
  ]
};
