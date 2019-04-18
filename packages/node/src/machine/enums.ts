enum Opcode {
  /**
   * Called at the end of execution before the return value to store a commitment
   */
  WRITE_COMMITMENT,

  /**
   * Requests a signature on the hash of previously generated EthereumCommitments.
   */
  OP_SIGN,

  /**
   * Same as above, but pass isIntermediary=true to EthereumCommitments.hashToSign
   * todo(xuanji): think of a better design to get rid of this
   */
  OP_SIGN_AS_INTERMEDIARY,

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
  Install = "install",
  InstallVirtualApp = "install-virtual-app",
  Setup = "setup",
  TakeAction = "takeAction",
  Uninstall = "uninstall",
  UninstallVirtualApp = "uninstall-virtual-app",
  Update = "update",
  Withdraw = "withdraw"
}

export { Opcode, Protocol };
