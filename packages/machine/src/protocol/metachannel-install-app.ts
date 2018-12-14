import { StateChannel } from "../models";
import { Opcode } from "../opcodes";
import { ProtocolMessage } from "../protocol-types-tbd";
import { Context } from "../types";

/**
 * @description This exchange is described at the following URL:
 *
 * FIXME: @xuanji pls add
 *
 */
// FIXME: Not fully implemented yet
export const METACHANNEL_INSTALL_APP_PROTOCOL = {
  0: [
    (message: ProtocolMessage, context: Context, state: StateChannel) => {
      // copy client message
      context.outbox.push(message);
      context.outbox[0].seq = 1;
      // context.outbox[0].toAddress = message.data.intermediary;
    },

    // send to intermediary
    Opcode.IO_SEND
  ],

  1: [
    (message: ProtocolMessage, context: Context, state: StateChannel) => {
      context.outbox.push(message);
      context.outbox[0].seq = 2;
      // context.outbox[0].fromAddress = message.data.initiating;
      // context.outbox[0].toAddress = message.data.responding;
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
    (message: ProtocolMessage, context: Context, state: StateChannel) => {
      context.outbox.push(message);
      context.outbox[0].seq = 3;
      // context.outbox[0].fromAddress = message.data.responding;
      // context.outbox[0].toAddress = message.data.intermediary;
    },

    Opcode.IO_SEND

    // // wait for self-remove
    // Opcode.IO_WAIT
  ]
};
