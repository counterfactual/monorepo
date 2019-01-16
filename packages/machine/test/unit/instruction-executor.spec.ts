import { AssetType } from "@counterfactual/types";
import { getAddress, hexlify, randomBytes, SigningKey } from "ethers/utils";

import { SetupCommitment } from "../../src/ethereum";
import { InstructionExecutor } from "../../src/instruction-executor";
import { AppInstance, StateChannel } from "../../src/models";
import { Opcode } from "../../src/opcodes";
import { ProtocolMessage } from "../../src/types";
import { generateRandomNetworkContext } from "../mocks";

describe("InstructionExecutor", () => {
  // Dummy network context
  const networkContext = generateRandomNetworkContext();

  // General interaction testing values
  const interaction = {
    sender: getAddress(hexlify(randomBytes(20))),
    receiver: getAddress(hexlify(randomBytes(20)))
  };

  // State channel testing values
  const stateChannelBeforeSetup = new StateChannel(
    getAddress(hexlify(randomBytes(20))),
    [interaction.sender, interaction.receiver].sort((a, b) =>
      parseInt(a, 16) < parseInt(b, 16) ? -1 : 1
    )
  );

  let instructionExecutor: InstructionExecutor;

  beforeAll(() => {
    instructionExecutor = new InstructionExecutor(networkContext);

    // We must register _some_ middleware for each opcode or the machine
    // will fail with an error like "While executing op number <x> at seq
    // <y> of protocol setup, execution failed with the following error.
    // TypeError: Cannot read property 'method' of undefined"
    instructionExecutor.register(Opcode.OP_SIGN_VALIDATE, () => {});
    instructionExecutor.register(Opcode.IO_SEND, () => {});
    instructionExecutor.register(Opcode.STATE_TRANSITION_COMMIT, () => {});
  });

  describe("the result of proposeStateTransition for the Setup Protocol", () => {
    let responder: SigningKey;
    let commitment: SetupCommitment;
    let stateChannelAfterSetup: StateChannel;
    let fb: AppInstance;

    beforeAll(async () => {
      responder = new SigningKey(hexlify(randomBytes(32)));

      // Extract the commitment passed to the OP_SIGN middleware for testing
      instructionExecutor.register(Opcode.OP_SIGN, (_, __, context) => {
        commitment = context.commitment as SetupCommitment;
        stateChannelAfterSetup = context.stateChannelsMap.get("0x00")!;
      });

      // Ensure validateSignature in Setup Protocol does not throw
      instructionExecutor.register(Opcode.IO_WAIT, (_, __, context) => {
        context.inbox.push({
          signature: responder.signDigest(context.commitment!.hashToSign())
        } as ProtocolMessage);
      });

      await instructionExecutor.runSetupProtocol(
        new Map<string, StateChannel>([["0x00", stateChannelBeforeSetup]]),
        {
          initiatingAddress: "0x00",
          respondingAddress: responder.address,
          multisigAddress: "0x00"
        }
      );

      fb = stateChannelAfterSetup.getFreeBalanceFor(AssetType.ETH);
    });

    describe("the proposed state transition of the channel", () => {
      it("should have the right metadatas", () => {
        expect(stateChannelAfterSetup.multisigAddress).toBe(
          stateChannelBeforeSetup.multisigAddress
        );
        expect(stateChannelAfterSetup.multisigOwners).toContain(
          interaction.sender
        );
        expect(stateChannelAfterSetup.multisigOwners).toContain(
          interaction.receiver
        );
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
        expect(commitment.multisigAddress).toBe(
          stateChannelBeforeSetup.multisigAddress
        );
      });

      it("should assume from and to as the owners of the multisig, sorted", () => {
        expect(commitment.multisigOwners).toEqual(
          stateChannelBeforeSetup.multisigOwners
        );
      });

      it("should construct the correct hash digest to sign", () => {
        expect(commitment.hashToSign()).toBe(
          new SetupCommitment(
            networkContext,
            stateChannelBeforeSetup.multisigAddress,
            stateChannelBeforeSetup.multisigOwners,
            fb.identity,
            fb.terms
          ).hashToSign()
        );
      });
    });
  });
});
