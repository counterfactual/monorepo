import { ProtocolMessage } from "../../types";

export function verifyInboxLengthEqualTo1(inbox: ProtocolMessage[]) {
  if (inbox.length !== 1) {
    throw Error(`Expected message to have been received after IO_WAIT`);
  }
}
