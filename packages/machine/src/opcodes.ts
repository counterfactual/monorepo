export enum Opcode {
  /**
   * Currently unused.
   */
  STATE_TRANSITION_COMMIT,

  /**
   * Requests a signature on the hash of a previously generated ProtocolOperation.
   */
  OP_SIGN,

  /**
   * todo(ldct): replace all occurrences of this by javascript code that does
   * some actual ecrecover and validation work
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
