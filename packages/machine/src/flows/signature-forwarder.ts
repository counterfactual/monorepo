import { StateChannel } from "../models";
import { ProtocolMessage } from "../protocol-types-tbd";
import { Context } from "../types";

export function prepareToSendSignature(
  message: ProtocolMessage,
  context: Context,
  state: StateChannel
) {
  context.outbox.push({
    ...message,
    signature: context.signature,
    seq: message.seq + 1
  });
}
