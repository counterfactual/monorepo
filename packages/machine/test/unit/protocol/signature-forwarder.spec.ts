import { NetworkContext } from "@counterfactual/types";
import { AddressZero, HashZero } from "ethers/constants";

import { Context, Protocol, StateChannel } from "../../../src";
import {
  addSignedCommitmentInResponseWithSeq2,
  addSignedCommitmentToOutboxForSeq1
} from "../../../src/protocol/utils/signature-forwarder";
import { ProtocolMessage } from "../../../src/types";

describe("Signature Forwarder Helpers", () => {
  let message: ProtocolMessage;
  let context: Context;

  beforeEach(() => {
    message = {
      protocol: Protocol.Setup,
      params: {
        initiatingAddress: AddressZero,
        respondingAddress: AddressZero,
        multisigAddress: AddressZero
      },
      fromAddress: AddressZero,
      toAddress: AddressZero,
      seq: 0,
      signature: undefined
    };

    context = {
      signatures: [{
        v: 0,
        r: HashZero,
        s: HashZero
      }],
      commitments: [],
      outbox: [],
      inbox: [],
      network: {} as NetworkContext,
      stateChannelsMap: new Map<string, StateChannel>()
    };
  });

  it("addSignedCommitmentInResponseWithSeq2 should add a message to the outbox", () => {
    addSignedCommitmentInResponseWithSeq2(message, context);

    expect(context.outbox.length).toBe(1);
    expect(context.outbox[0].fromAddress).toBe(message.fromAddress);
    expect(context.outbox[0].toAddress).toBe(message.toAddress);
    expect(context.outbox[0].params).toEqual(message.params);
    expect(context.outbox[0].protocol).toBe(message.protocol);
    expect(context.outbox[0].seq).toBe(2);
    expect(context.outbox[0].signature).toBe(context.signatures[0]);
  });

  it("addSignedCommitmentToOutboxForSeq1 should add a message to the outbox", () => {
    addSignedCommitmentToOutboxForSeq1(message, context);

    expect(context.outbox.length).toBe(1);
    expect(context.outbox[0].fromAddress).toBe(message.fromAddress);
    expect(context.outbox[0].toAddress).toBe(message.toAddress);
    expect(context.outbox[0].params).toEqual(message.params);
    expect(context.outbox[0].protocol).toBe(message.protocol);
    expect(context.outbox[0].seq).toBe(1);
    expect(context.outbox[0].signature).toBe(context.signatures[0]);
  });
});
