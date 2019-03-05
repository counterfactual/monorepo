import { Context, ProtocolMessage } from "../../types";

/// Set `context.finalCommitment` in the simple cases where the commitment
/// is in `context.commitments[0]` and the signature is in etiher `inbox[0]` or
/// `message`.
export function setFinalCommitment(fromInbox: boolean) {
  return (message: ProtocolMessage, context: Context) => {
    const commitment = context.commitments[0];
    const mySignature = context.signatures[0];
    const counterpartySignature = fromInbox
      ? context.inbox[0].signature!
      : message.signature!;

    context.finalCommitment = commitment.transaction([
      mySignature,
      counterpartySignature
    ]);
  };
}
