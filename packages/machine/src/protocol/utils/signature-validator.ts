import { recoverAddress } from "ethers/utils";

import { StateChannel } from "../../models";
import { ProtocolMessage } from "../../protocol-types-tbd";
import { Context } from "../../types";

export function validateSignature(
  message: ProtocolMessage,
  context: Context,
  state: StateChannel
) {
  if (context.commitment === undefined) {
    throw Error("validateSignature function received an undefined commitment");
  }

  if (message.signature === undefined) {
    throw Error("validateSignature function received an undefined signature");
  }

  if (
    message.fromAddress !==
    recoverAddress(context.commitment.hashToSign(), message.signature)
  ) {
    throw Error("Received invalid signature on validateSignature function");
  }
}
