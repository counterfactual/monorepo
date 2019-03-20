/**
 * @summary This is a `seq` value that messages can take on which
 * _should not_ be submitted into the protocol execution. A message
 * with seq === -1 should be considered a response to another message
 * and this should continue after an IO_SEND_AND_WAIT opcode.
 */
export const UNASSIGNED_SEQ_NO = -1;
