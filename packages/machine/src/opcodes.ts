export enum Opcode {
  /**
   * Optimistically creates the new state that will result if a protocol
   * completes. Useful for other opcodes that may need to know about such state,
   * for example, to generate the correct cf operation.
   */
  STATE_TRANSITION_PROPOSE,

  /**
   * Saves the new state upon completion of a protocol, using the state from
   * STATE_TRANSITION_PROPOSE. Assumes all messages have been exchanged and
   * the state has gone through PROPOSE and PREPARE already.
   */
  STATE_TRANSITION_COMMIT,

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
   * Sends a ClientMessage to a peer.
   */
  IO_SEND,

  /**
   * Blocks the action execution until the next message is received by a peer.
   * The registered middleware for this instruction *must* return the received
   * ClientMessage from the peer.
   */
  IO_WAIT
}
