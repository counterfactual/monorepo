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
   * Middleware hook to send a ProtocolMessage to a peer.
   */
  IO_SEND,

  /**
   * Middleware hook to both send and wait for a response from a ProtocolMessage
   */
  IO_SEND_AND_WAIT,

  /**
   * Middleware hook to write the state channel to store. Used to lock channel
   * between protocols.
   */
  PERSIST_STATE_CHANNEL
}

enum Protocol {
  Install = "install",
  InstallVirtualApp = "install-virtual-app",
  Setup = "setup",
  Propose = "propose",
  TakeAction = "takeAction",
  Uninstall = "uninstall",
  UninstallVirtualApp = "uninstall-virtual-app",
  Update = "update",
  Withdraw = "withdraw"
}

export { Opcode, Protocol };
