import { ProtocolMessage } from "../../protocol-types-tbd";
import { Context } from "../../types";

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
    signature: context.signature,
    seq: 1
  });
}

/**
 * @summary Appends a `ProtocolMessage` to the outbox of a `Context
 * with `seq` hard-coded to 2. This is useful for protocols like
 * Setup, Install, Update, and Uninstall which are single-round-trip
 * based. In this case, B uses this to respond back to A. There is no
 * seq 2 for these kinds of protocols, so this is an alias for "use this
 * protocol message to finish up your callback on the IO_WAIT opcode"
 *
 * @param message the message B initiated his machine protocol execution
 * @param context B's context at this point in the protocol execution
 */
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
