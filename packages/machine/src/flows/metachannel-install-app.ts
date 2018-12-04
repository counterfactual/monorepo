import { Context } from "../instruction-executor";
import { Opcode } from "../opcodes";
import { InternalMessage } from "../types";

export const METACHANNEL_INSTALL_APP_FLOW = {
  0: [
    (message: InternalMessage, context: Context, node) => {
      // copy client message
      context.intermediateResults.outbox.push(message.clientMessage);
      context.intermediateResults.outbox[0].seq = 1;
      context.intermediateResults.outbox[0].toAddress =
        message.clientMessage.data.intermediary;
    },

    // send to intermediary
    Opcode.IO_SEND
  ],
  1: [
    (message: InternalMessage, context: Context, node) => {
      const clientMessage = message.clientMessage;
      context.intermediateResults.outbox.push(clientMessage);
      context.intermediateResults.outbox[0].seq = 2;
      context.intermediateResults.outbox[0].fromAddress =
        clientMessage.data.initiating;
      context.intermediateResults.outbox[0].toAddress =
        clientMessage.data.responding;
    },
    Opcode.IO_SEND,
    // wait for the install countersign
    Opcode.IO_WAIT,
    () => {}

    // // send the self-remove
    // Opcode.IO_SEND,
    // Opcode.IO_SEND
  ],
  2: [
    (message: InternalMessage, context: Context, node) => {
      // countersign
      const clientMessage = message.clientMessage;
      context.intermediateResults.outbox.push(clientMessage);
      context.intermediateResults.outbox[0].seq = 3;
      context.intermediateResults.outbox[0].fromAddress =
        clientMessage.data.responding;
      context.intermediateResults.outbox[0].toAddress =
        clientMessage.data.intermediary;
    },
    Opcode.IO_SEND

    // // wait for self-remove
    // Opcode.IO_WAIT
  ]
};
