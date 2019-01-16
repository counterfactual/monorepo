import { ProtocolMessage } from "../../protocol-types-tbd";
import { Context } from "../../types";

export function addSignedCommitmentToOutboxForSeq1(
  message: ProtocolMessage,
  context: Context
) {
  context.outbox.push({
    ...message,
    signature: context.signature,
    seq: 1
  });
}

export function addSignedCommitmentInResponseWithSeq2(
  message: ProtocolMessage,
  context: Context
) {
  context.outbox.push({
    ...message,
    signature: context.signature,
    seq: 2
  });
}
