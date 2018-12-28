import { AssetType } from "@counterfactual/types";
import { getAddress, hexlify, randomBytes } from "ethers/utils";

import { SetupCommitment } from "../../src/ethereum";
import { InstructionExecutor } from "../../src/instruction-executor";
import { AppInstance, StateChannel } from "../../src/models";
import { Opcode } from "../../src/opcodes";
import { Context } from "../../src/types";

describe("InstructionExecutor", () => {
  // Test network context
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
  const stateChannel = new StateChannel(
    getAddress(hexlify(randomBytes(20))),
    [interaction.sender, interaction.receiver].sort((a, b) =>
      parseInt(a, 16) < parseInt(b, 16) ? -1 : 1
    )
  );

  let instructionExecutor: InstructionExecutor;

  beforeAll(() => {
    instructionExecutor = new InstructionExecutor(networkContext);

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

  describe("the result of STATE_TRANSITION_PROPOSE for the Setup Protocol", () => {
    let commitment: SetupCommitment;
    let channel: StateChannel;
    let fb: AppInstance;

    beforeAll(() => {
      instructionExecutor.middleware.add(
        Opcode.OP_SIGN,
        (_, __, context: Context) => {
          commitment = context.operation as SetupCommitment;
          channel = context.stateChannel;
        }
      );

      instructionExecutor.runSetupProtocol(stateChannel);

      fb = channel.getFreeBalanceFor(AssetType.ETH);
    });

    describe("the proposed state transition of the channel", () => {
      it("should have the right metadatas", () => {
        expect(channel.multisigAddress).toBe(stateChannel.multisigAddress);
        expect(channel.multisigOwners).toContain(interaction.sender);
        expect(channel.multisigOwners).toContain(interaction.receiver);
      });
    });

    describe("the computed SetupCommitment", () => {
      it("should use the network context passed into instruction executor", () => {
        expect(commitment.networkContext).toEqual(networkContext);
      });

      it("should use the default free balance terms", () => {
        expect(commitment.freeBalanceTerms).toEqual(fb.terms);
      });

      it("should use the default free balance app identity", () => {
        expect(commitment.freeBalanceAppIdentity).toEqual(fb.identity);
      });

      it("should be based on the multisig passed into the protocol executor", () => {
        expect(commitment.multisigAddress).toBe(stateChannel.multisigAddress);
      });

      it("should assume from and to as the owners of the multisig, sorted", () => {
        expect(commitment.multisigOwners).toEqual(stateChannel.multisigOwners);
      });

      it("should construct the correct hash digest to sign", () => {
        expect(commitment.hashToSign()).toBe(
          new SetupCommitment(
            networkContext,
            stateChannel.multisigAddress,
            stateChannel.multisigOwners,
            fb.identity,
            fb.terms
          ).hashToSign()
        );
      });
    });
  });
});
