import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import { NODE_EVENTS } from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  createChannel,
  installVirtualApp
} from "./utils";

expect.extend({ toBeLt });

jest.setTimeout(15000);

describe("Concurrently installing virtual applications with same intermediary", () => {
  let multisigAddressAB: string;
  let multisigAddressBC: string;
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  beforeEach(async () => {
    const context: SetupContext = await setup(global, true);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    nodeC = context["C"].node;

    multisigAddressAB = await createChannel(nodeA, nodeB);
    multisigAddressBC = await createChannel(nodeB, nodeC);

    await collateralizeChannel(
      multisigAddressAB,
      nodeA,
      nodeB,
      parseEther("2")
    );

    await collateralizeChannel(
      multisigAddressBC,
      nodeB,
      nodeC,
      parseEther("2")
    );
  });

  it("can handle two TicTacToeApp proposals syncronously made", done => {
    let i = 0;

    nodeA.on(NODE_EVENTS.INSTALL_VIRTUAL, () => {
      i += 1;
      if (i === 2) done();
    });

    for (const i of Array(2)) {
      installVirtualApp(
        nodeA,
        nodeB,
        nodeC,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
      );
    }
  });

  it("can handle two TicTacToeApp proposals asyncronously made", async done => {
    let i = 0;

    nodeA.on(NODE_EVENTS.INSTALL_VIRTUAL, () => {
      i += 1;
      if (i === 2) done();
    });

    for (const i of Array(2)) {
      await installVirtualApp(
        nodeA,
        nodeB,
        nodeC,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
      );
    }
  });
});
