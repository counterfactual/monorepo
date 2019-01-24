enum Opcode {
  /**
   * Called at the end of execution before the return value to store a commitment
   */
  STATE_TRANSITION_COMMIT,

  /**
   * Requests a signature on the hash of a previously generated ProtocolOperation.
   */
  OP_SIGN,

  /**
   * todo(xuanji): replace all occurrences of this by javascript code that does
   * some actual ecrecover and validation work
   */
  OP_SIGN_VALIDATE,

  /**
   * Middleware hook to send a ProtocolMessage to a peer.
   */
  IO_SEND,

  /**
   * Middleware hook to both send and wait for a response from a ProtocolMessage
   */
  IO_SEND_AND_WAIT
}

enum Protocol {
  Setup = "setup",
  Install = "install",
  Update = "update",
  Uninstall = "uninstall",
  InstallVirtualApp = "install-virtual-app"
}

export { Opcode, Protocol };
