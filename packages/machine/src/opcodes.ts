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
   * Middleware hook to send a ProtocolMessage to a peer.
   */
  IO_SEND,

  /**
   * Middleware hook to receive a ProtocolMessage from a peer.
   */
  IO_WAIT
}
