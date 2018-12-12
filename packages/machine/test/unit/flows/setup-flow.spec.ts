import { legacy } from "@counterfactual/cf.js";
import { ethers } from "ethers";

import { SETUP_FLOW } from "../../../src/flows/setup";
import { Context } from "../../../src/instruction-executor";
import { constructSetupOp } from "../../../src/middleware/protocol-operation/op-generator";
import { SetupProposer } from "../../../src/middleware/state-transition/setup-proposer";
import { Node } from "../../../src/node";
import { Opcode } from "../../../src/opcodes";
import { InternalMessage } from "../../../src/types";

const { getAddress, hexlify, randomBytes } = ethers.utils;

describe("SetupFlow", () => {
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
  const stateChannel = {
    multisigAddress: getAddress(hexlify(randomBytes(20))),
    multisigOwners: [interaction.sender, interaction.receiver].sort((a, b) =>
      parseInt(a, 16) < parseInt(b, 16) ? -1 : 1
    )
  };

  it("should update the intermediate results of the context", () => {
    const message = new InternalMessage(
      legacy.node.ActionName.SETUP,
      Opcode.STATE_TRANSITION_PROPOSE,
      {
        action: legacy.node.ActionName.SETUP,
        data: {},
        multisigAddress: stateChannel.multisigAddress,
        fromAddress: interaction.sender,
        toAddress: interaction.receiver,
        seq: 0
      }
    );

    const context = {
      inbox: [],
      outbox: []
    } as Context;

    const node = new Node({}, networkContext);

    // @ts-ignore
    SETUP_FLOW[0][0](message, context, node);

    const { proposedStateTransition, operation } = context;

    const proposal = SetupProposer.propose(message);

    expect(proposedStateTransition).toEqual(proposal);

    expect(operation).toEqual(constructSetupOp(message, node, proposal.state));
  });
});
