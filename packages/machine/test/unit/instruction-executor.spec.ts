import { AssetType } from "@counterfactual/types";
import { getAddress, hexlify, randomBytes, SigningKey } from "ethers/utils";

import { Opcode } from "../../src/enums";
import { SetupCommitment } from "../../src/ethereum";
import { InstructionExecutor } from "../../src/instruction-executor";
import { AppInstance, StateChannel } from "../../src/models";
import { ProtocolMessage } from "../../src/types";
import { generateRandomNetworkContext } from "../mocks";

describe("InstructionExecutor", () => {
  // Dummy network context
  const networkContext = generateRandomNetworkContext();

  const responder = new SigningKey(hexlify(randomBytes(32)));

  // General interaction testing values
  const interaction = {
    sender: getAddress(hexlify(randomBytes(20))),
    receiver: responder.address
  };

  // State channel testing values
  const multisigAddress = getAddress(hexlify(randomBytes(20)));
  const multisigOwners = [interaction.sender, interaction.receiver].sort(
    (a, b) => (parseInt(a, 16) < parseInt(b, 16) ? -1 : 1)
  );

  let instructionExecutor: InstructionExecutor;

  beforeAll(() => {
    instructionExecutor = new InstructionExecutor(networkContext);

    // We must register _some_ middleware for each opcode or the machine
    // will fail with an error like "While executing op number <x> at seq
    // <y> of protocol setup, execution failed with the following error.
    // TypeError: Cannot read property 'method' of undefined"
    instructionExecutor.register(Opcode.OP_SIGN_VALIDATE, () => {});
    instructionExecutor.register(Opcode.STATE_TRANSITION_COMMIT, () => {});
  });

  describe("the result of proposeStateTransition for the Setup Protocol", () => {
    let commitment: SetupCommitment;
    let stateChannelAfterSetup: StateChannel;
    let fb: AppInstance;

    beforeAll(async () => {
      // Extract the commitment passed to the OP_SIGN middleware for testing
      instructionExecutor.register(Opcode.OP_SIGN, (_, __, context) => {
        commitment = context.commitments[0] as SetupCommitment;
        const maybeStateChannelAfterSetup = context.stateChannelsMap.get(
          multisigAddress
        );
        if (!maybeStateChannelAfterSetup) {
          throw Error("could not find stateChannelAfterSetup");
        }
        stateChannelAfterSetup = maybeStateChannelAfterSetup;
      });

      // Ensure validateSignature in Setup Protocol does not throw
      instructionExecutor.register(
        Opcode.IO_SEND_AND_WAIT,
        (_, __, context) => {
          context.inbox.push({
            signature: responder.signDigest(context.commitments[0].hashToSign())
          } as ProtocolMessage);
        }
      );

      await instructionExecutor.runSetupProtocol({
        multisigAddress,
        initiatingAddress: interaction.sender,
        respondingAddress: responder.address
      });

      fb = stateChannelAfterSetup.getFreeBalanceFor(AssetType.ETH);
    });

    describe("the proposed state transition of the channel", () => {
      it("should have the right metadatas", () => {
        expect(stateChannelAfterSetup.multisigAddress).toBe(multisigAddress);
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
        expect(commitment.multisigAddress).toBe(multisigAddress);
      });

      it("should assume from and to as the owners of the multisig, sorted", () => {
        expect(commitment.multisigOwners).toEqual(multisigOwners);
      });

      it("should construct the correct hash digest to sign", () => {
        expect(commitment.hashToSign()).toBe(
          new SetupCommitment(
            networkContext,
            multisigAddress,
            multisigOwners,
            fb.identity,
            fb.terms
          ).hashToSign()
        );
      });
    });
  });
});
