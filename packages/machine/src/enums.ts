import { Context, ProtocolMessage } from "@counterfactual/machine/src/types";

enum Opcode {
  /**
   * Called at the end of execution before the return value to store a commitment
   */
  STATE_TRANSITION_COMMIT,

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
  IO_SEND_AND_WAIT
}

const OP_SIGN_0 = [
  (message: ProtocolMessage, context: Context) => {
    context.middlewareArgs = [0];
  },
  Opcode.OP_SIGN,
  (message: ProtocolMessage, context: Context) => {
    context.middlewareArgs = [];
  }
];

enum Protocol {
  Setup = "setup",
  Install = "install",
  Update = "update",
  Withdraw = "withdraw",
  Uninstall = "uninstall",
  InstallVirtualApp = "install-virtual-app",
  UninstallVirtualApp = "uninstall-virtual-app"
}

export { Opcode, Protocol, OP_SIGN_0 };
