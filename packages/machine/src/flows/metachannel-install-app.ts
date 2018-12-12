import { Context } from "../instruction-executor";
import { Opcode } from "../opcodes";
import { InternalMessage } from "../types";

export const METACHANNEL_INSTALL_APP_FLOW = {
  0: [
    (message: InternalMessage, context: Context, node) => {
      // copy client message
      context.outbox.push(message.clientMessage);
      context.outbox[0].seq = 1;
      context.outbox[0].toAddress = message.clientMessage.data.intermediary;
    },

    // send to intermediary
    Opcode.IO_SEND
  ],

  1: [
    (message: InternalMessage, context: Context, node) => {
      const clientMessage = message.clientMessage;
      context.outbox.push(clientMessage);
      context.outbox[0].seq = 2;
      context.outbox[0].fromAddress = clientMessage.data.initiating;
      context.outbox[0].toAddress = clientMessage.data.responding;
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
      context.outbox.push(clientMessage);
      context.outbox[0].seq = 3;
      context.outbox[0].fromAddress = clientMessage.data.responding;
      context.outbox[0].toAddress = clientMessage.data.intermediary;
    },

    Opcode.IO_SEND

    // // wait for self-remove
    // Opcode.IO_WAIT
  ]
};
