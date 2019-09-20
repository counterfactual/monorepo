enum Opcode {
  /**
   * Called at the end of execution before the return value to store a commitment
   */
  WRITE_COMMITMENT,

  /**
   * Middleware hook to wait for a response from a ProtocolMessage
   */
  IO_WAIT,

  /**
   * Requests a signature on the hash of previously generated EthereumCommitments.
   */
  OP_SIGN,

  /**
   * Middleware hook to send a ProtocolMessage to a peer.
   */
  IO_SEND,

  /**
   * Middleware hook to send from the initiating party downstream to other
   * parties to indicate the finish of the protocol.
   */
  IO_SEND_FIN,

  /**
   * Middleware hook to both send and wait for a response from a ProtocolMessage
   */
  IO_SEND_AND_WAIT,

  /**
   * Middleware hook to write the state channel to store. Used to lock channel
   * betweeen protocols.
   */
  PERSIST_STATE_CHANNEL
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
