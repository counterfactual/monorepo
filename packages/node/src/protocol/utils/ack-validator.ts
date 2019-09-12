export function assertAck(ack: boolean, responderXpub: string) {
  if (!ack || ack !== true) {
    throw Error(
      `did not receive ack from responder ${responderXpub} on Install protocol`
    );
  }
}
