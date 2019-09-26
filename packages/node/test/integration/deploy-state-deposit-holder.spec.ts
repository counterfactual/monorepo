import { HashZero } from "ethers/constants";
import log from "loglevel";

import { Node, NODE_EVENTS } from "../../src";
import { toBeEq } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import { createChannel, deployStateDepositHolder } from "./utils";

expect.extend({ toBeEq });

log.setLevel(log.levels.SILENT);

describe("Node method follows spec - deploy state desposit holder", () => {
  let nodeA: Node;
  let nodeB: Node;
  let multisigAddress: string;

  beforeEach(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;

    multisigAddress = await createChannel(nodeA, nodeB);
    expect(multisigAddress).toBeDefined();
    nodeA.off(NODE_EVENTS.DEPOSIT_CONFIRMED);
    nodeB.off(NODE_EVENTS.DEPOSIT_CONFIRMED);
  });

  it("deploys the multisig when the method is called", async () => {
    const deployTxHash = await deployStateDepositHolder(nodeA, multisigAddress);

    expect(deployTxHash).toBeDefined();
    expect(deployTxHash !== HashZero).toBeTruthy();
  });

  it("cannot deploy multisig when", async () => {
    const deployTxHash = await deployStateDepositHolder(nodeA, multisigAddress);

    expect(deployTxHash).toBeDefined();
    expect(deployTxHash !== HashZero).toBeTruthy();
  });
});
