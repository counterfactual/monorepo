import { Context, ProtocolMessage } from "../../types";

/**
 * @summary This is a `seq` value that messages can take on which
 * _should not_ be submitted into the protocol execution. A message
 * with seq === -1 should be considered a response to another message
 * and this should continue after an IO_SEND_AND_WAIT opcode.
 */
export const UNASSIGNED_SEQ_NO = -1;

/**
 * @summary Appends a `ProtocolMessage` to the outbox of a `Context
 * with `seq` hard-coded to 1. This is useful for protocols like
 * Setup, Install, Update, and Uninstall which are single-round-trip
 * based and thus A will use this to generate the message to send to B.
 *
 * @param message the message A initiated his machine protocol execution with
 * @param context A's context at this point in the protocol execution
 */
export function addSignedCommitmentToOutboxForSeq1(
  message: ProtocolMessage,
  context: Context
) {
  context.outbox.push({
    ...message,
    signature: context.signatures[0],
    seq: 1
  });
}

/**
 * @summary Appends a `ProtocolMessage` to the outbox of a `Context
 * with `seq` hard-coded to 2. This is useful for protocols like
 * Setup, Install, Update, and Uninstall which are single-round-trip
 * based. In this case, B uses this to respond back to A. There is no
 * seq 2 for these kinds of protocols, so this is an alias for "use this
 * protocol message to finish up your callback on the IO_SEND_AND_WAIT opcode"
 *
 * Additionally, it swaps the `from` and `to` addresses since in the case
 * where this helper is used, the `message` is one received initially from
 * the initiator of the protocol (so `from` is the other guy to start)
 *
 * @param message the message B initiated his machine protocol execution
 * @param context B's context at this point in the protocol execution
 */
export function addSignedCommitmentInResponse(
  message: ProtocolMessage,
  context: Context
) {
  context.outbox.push({
    ...message,
    fromAddress: message.toAddress,
    toAddress: message.fromAddress,
    signature: context.signatures[0],
    seq: UNASSIGNED_SEQ_NO
  });
}
