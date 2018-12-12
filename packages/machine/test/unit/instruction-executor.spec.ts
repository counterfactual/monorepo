import { AppIdentity, ETHBucketAppState } from "@counterfactual/types";
import { ethers } from "ethers";

import {
  Context,
  InstructionExecutor,
  InstructionExecutorConfig
} from "../../src/instruction-executor";
import { OpSetup } from "../../src/middleware/protocol-operation";
import { Opcode } from "../../src/opcodes";
import { StateProposal } from "../../src/types";
// import { InternalMessage } from "../../src/types";
import {
  freeBalanceTerms,
  freeBalanceTermsHash,
  getFreeBalanceAppInterfaceHash
} from "../../src/utils/free-balance";
import { MockResponseSink } from "../mocks";

const { hexlify, randomBytes, getAddress } = ethers.utils;
const { Zero } = ethers.constants;

describe("InstructionExecutor", () => {
  const networkContext = {
    ETHBucket: getAddress(hexlify(randomBytes(20))),
    StateChannelTransaction: getAddress(hexlify(randomBytes(20))),
    MultiSend: getAddress(hexlify(randomBytes(20))),
    NonceRegistry: getAddress(hexlify(randomBytes(20))),
    AppRegistry: getAddress(hexlify(randomBytes(20))),
    ETHBalanceRefund: getAddress(hexlify(randomBytes(20)))
  };

  // General interaction testing values
  const interaction = {
    sender: getAddress(hexlify(randomBytes(20))),
    receiver: getAddress(hexlify(randomBytes(20)))
  };

  // State channel testing values
  const stateChannel = {
    multisigAddress: getAddress(hexlify(randomBytes(20))),
    multisigOwners: [interaction.sender, interaction.receiver].sort((a, b) =>
      parseInt(a, 16) < parseInt(b, 16) ? -1 : 1
    )
  };

  // Test free balance values
  const freeBalance = {
    defaultTimeout: 100, // FIXME: must be 100

    appIdentity: {
      owner: stateChannel.multisigAddress,
      signingKeys: stateChannel.multisigOwners,
      appInterfaceHash: getFreeBalanceAppInterfaceHash(
        networkContext.ETHBucket
      ),
      termsHash: freeBalanceTermsHash,
      defaultTimeout: 100
    } as AppIdentity,

    terms: freeBalanceTerms,

    initialState: {
      alice: stateChannel.multisigOwners[0],
      bob: stateChannel.multisigOwners[1],
      aliceBalance: Zero,
      bobBalance: Zero
    } as ETHBucketAppState
  };

  let instructionExecutor: InstructionExecutor;

  beforeAll(() => {
    instructionExecutor = new InstructionExecutor(
      new InstructionExecutorConfig(
        new MockResponseSink(),
        networkContext,
        undefined
      )
    );

    // We must define _some_ methods for each opcode or the machine
    // will fail with an error like "While executing op number <x> at seq
    // <y> of protocol setup, execution failed with the following error.
    // TypeError: Cannot read property 'method' of undefined"
    const { middleware } = instructionExecutor;
    middleware.add(Opcode.OP_SIGN_VALIDATE, () => {});
    middleware.add(Opcode.IO_SEND, () => {});
    middleware.add(Opcode.IO_WAIT, () => {});
    middleware.add(Opcode.STATE_TRANSITION_COMMIT, () => {});
  });

  // const signingKey = new SigningKey(randomBytes(32));
  // const signature = signingKey.signDigest(op.hashToSign());
  // context.signature = signature;
  // next();

  describe("the result of STATE_TRANSITION_PROPOSE for the Setup Protocol", () => {
    let op: OpSetup;
    let channel: StateProposal;

    beforeAll(() => {
      const { middleware } = instructionExecutor;

      middleware.add(Opcode.OP_SIGN, (message, next, context: Context) => {
        op = context.operation as OpSetup;
        channel = context.proposedStateTransition!;
        console.log(channel);
      });

      instructionExecutor.runSetupProtocol(
        interaction.sender,
        interaction.receiver,
        stateChannel.multisigAddress
      );
    });

    describe("the proposed state transition of the channel", () => {
      // FIXME: This field makes no sense to me
      it("should not fuck wit it", () => {
        expect(channel.cfAddr).toBe(undefined);
      });

      it("should have an entry for the state channel we're dealing with", () => {
        expect(channel.state[stateChannel.multisigAddress]).not.toBe(undefined);
      });

      it("should have the right metadatas", () => {
        const state = channel.state[stateChannel.multisigAddress];
        expect(state.multisigAddress).toBe(stateChannel.multisigAddress);
        expect(state.me).toBe(interaction.sender);
        expect(state.counterParty).toBe(interaction.receiver);
        console.log(state.freeBalance);
      });
    });

    describe("the computed OpSetup", () => {
      it("should use the network context passed into instruction executor", () => {
        expect(op.networkContext).toEqual(networkContext);
      });

      it("should use the default free balance terms", () => {
        expect(op.freeBalanceTerms).toEqual(freeBalance.terms);
      });

      it("should use the default free balance app identity", () => {
        expect(op.freeBalanceAppIdentity).toEqual(freeBalance.appIdentity);
      });

      it("should be based on the multisig passed into the protocol executor", () => {
        expect(op.multisig).toBe(stateChannel.multisigAddress);
      });

      it("should assume from and to as the owners of the multisig, sorted", () => {
        expect(op.multisigOwners).toEqual(stateChannel.multisigOwners);
      });

      it("should construct the correct hash digest to sign", () => {
        expect(op.hashToSign()).toBe(
          new OpSetup(
            networkContext,
            stateChannel.multisigAddress,
            stateChannel.multisigOwners,
            freeBalance.appIdentity,
            freeBalance.terms
          ).hashToSign()
        );
      });
    });
  });
});
