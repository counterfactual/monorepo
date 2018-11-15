import * as cf from "@counterfactual/cf.js";

export enum Opcode {
  /**
   * Optimistically creates the new state that will result if a protocol
   * completes. Useful for other opcodes that may need to know about such state,
   * for example, to generate the correct cf operation.
   */
  STATE_TRANSITION_PROPOSE = 0,
  /**
   * Saves the new state upon completion of a protocol, using the state from
   * STATE_TRANSITION_PROPOSE. Assumes all messages have been exchanged and
   * the state has gone through PROPOSE and PREPARE already.
   */
  STATE_TRANSITION_COMMIT,
  /**
   * Returns a ProtocolOperation, giving the ability to create a hash to sign
   * or construct a transaction to be broadcast on chain.
   */
  OP_GENERATE,
  /**
   * Requests a signature on the hash of a previously generated ProtocolOperation.
   */
  OP_SIGN,
  /**
   * Ensures a signature is both correclty signed and is representative of a
   * correctly formed cf operation.
   */
  OP_SIGN_VALIDATE,
  /**
   * Prepares a message to be sent out to a peer, transitioning the message
   * to the next in the cf-protocol sequence.
   */
  IO_PREPARE_SEND,
  /**
   * Sends a ClientMessage to a peer.
   */
  IO_SEND,
  /**
   * Blocks the action execution until the next message is received by a peer.
   * The registered middleware for this instruction *must* return the received
   * ClientMessage from the peer.
   */
  IO_WAIT,
  /**
   * Generates a pair of siging keys to be used with an application.
   */
  KEY_GENERATE,
  /**
   * Represents all instructions. Registering for this instruction will yield
   * all messages.
   */
  ALL
}

/**
 * Instructions executed on the intiating end of a protocol, i.e., a peer who
 * starts a protocol with a peer out of nowhere.
 */
export const instructions = {
  [cf.legacy.node.ActionName.UPDATE]: [
    Opcode.STATE_TRANSITION_PROPOSE,
    Opcode.OP_GENERATE,
    Opcode.OP_SIGN,
    Opcode.IO_PREPARE_SEND,
    Opcode.IO_SEND,
    Opcode.IO_WAIT,
    Opcode.OP_SIGN_VALIDATE,
    Opcode.STATE_TRANSITION_COMMIT
  ],
  [cf.legacy.node.ActionName.SETUP]: [
    Opcode.STATE_TRANSITION_PROPOSE,
    Opcode.OP_GENERATE,
    Opcode.OP_SIGN,
    Opcode.IO_PREPARE_SEND,
    Opcode.IO_SEND,
    Opcode.IO_WAIT,
    Opcode.OP_SIGN_VALIDATE,
    Opcode.STATE_TRANSITION_COMMIT
  ],
  [cf.legacy.node.ActionName.INSTALL]: [
    Opcode.KEY_GENERATE,
    Opcode.IO_PREPARE_SEND,
    Opcode.IO_SEND,
    Opcode.IO_WAIT,
    Opcode.STATE_TRANSITION_PROPOSE,
    Opcode.OP_GENERATE,
    Opcode.OP_SIGN_VALIDATE,
    Opcode.OP_SIGN,
    Opcode.IO_PREPARE_SEND,
    Opcode.IO_SEND,
    Opcode.STATE_TRANSITION_COMMIT
  ],
  [cf.legacy.node.ActionName.UNINSTALL]: [
    Opcode.STATE_TRANSITION_PROPOSE,
    Opcode.OP_GENERATE,
    Opcode.OP_SIGN,
    Opcode.IO_PREPARE_SEND,
    Opcode.IO_SEND,
    Opcode.IO_WAIT,
    Opcode.OP_SIGN_VALIDATE,
    Opcode.STATE_TRANSITION_COMMIT
  ]
};

/**
 * Instructions executed on the receiving end of a protocol, i.e., by a peer
 * who did not initiate a given protocol.
 */
export const ackInstructions = {
  [cf.legacy.node.ActionName.UPDATE]: [
    Opcode.STATE_TRANSITION_PROPOSE,
    Opcode.OP_GENERATE,
    Opcode.OP_SIGN_VALIDATE,
    Opcode.OP_SIGN,
    Opcode.IO_PREPARE_SEND,
    Opcode.IO_SEND,
    Opcode.STATE_TRANSITION_COMMIT
  ],
  [cf.legacy.node.ActionName.SETUP]: [
    Opcode.STATE_TRANSITION_PROPOSE,
    Opcode.OP_GENERATE,
    Opcode.OP_SIGN_VALIDATE,
    Opcode.OP_SIGN,
    Opcode.IO_PREPARE_SEND,
    Opcode.IO_SEND,
    Opcode.STATE_TRANSITION_COMMIT
  ],
  [cf.legacy.node.ActionName.INSTALL]: [
    Opcode.KEY_GENERATE,
    Opcode.STATE_TRANSITION_PROPOSE,
    Opcode.OP_GENERATE,
    Opcode.OP_SIGN,
    Opcode.IO_PREPARE_SEND,
    Opcode.IO_SEND,
    Opcode.IO_WAIT,
    Opcode.OP_SIGN_VALIDATE,
    Opcode.STATE_TRANSITION_COMMIT
  ],
  [cf.legacy.node.ActionName.UNINSTALL]: [
    Opcode.STATE_TRANSITION_PROPOSE,
    Opcode.OP_GENERATE,
    Opcode.OP_SIGN_VALIDATE,
    Opcode.OP_SIGN,
    Opcode.IO_PREPARE_SEND,
    Opcode.IO_SEND,
    Opcode.STATE_TRANSITION_COMMIT
  ]
};
