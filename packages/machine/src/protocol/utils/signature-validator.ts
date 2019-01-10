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
    throw Error("OP_SIGN_VALIDATE received an undefined commitment");
  }

  if (context.signature === undefined) {
    throw Error("OP_SIGN_VALIDATE received an undefined signature");
  }

  if (
    message.fromAddress !==
    recoverAddress(context.commitment.hashToSign(), context.signature)
  ) {
    throw Error("Received invalid signature on OP_SIGN_VALIDATE");
  }
}
