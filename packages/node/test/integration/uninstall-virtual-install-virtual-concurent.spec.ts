import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import { NODE_EVENTS } from "../../src/types";
import { toBeLt } from "../engine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  constructUninstallVirtualRpc,
  createChannel,
  installVirtualApp
} from "./utils";

expect.extend({ toBeLt });

jest.setTimeout(15000);

describe("Concurrently uninstalling virtual and installing virtual applications without issue", () => {
  let multisigAddressAB: string;
  let multisigAddressBC: string;
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;
  let installedAppInstanceId: string;

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

    // install a virtual app
    installedAppInstanceId = await installVirtualApp(
      nodeA,
      nodeB,
      nodeC,
      (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
    );
  });

  it("will uninstall virtual and install virtual successfully when called by the same node", async done => {
    let completedEvents = 0;
    const registerEvent = () => {
      completedEvents += 1;
      if (completedEvents === 2) {
        done();
      }
    };
    nodeA.once(NODE_EVENTS.INSTALL_VIRTUAL, () => {
      registerEvent();
    });

    nodeC.once(NODE_EVENTS.UNINSTALL_VIRTUAL, () => {
      registerEvent();
    });

    nodeA.rpcRouter.dispatch(
      constructUninstallVirtualRpc(
        installedAppInstanceId,
        nodeB.publicIdentifier
      )
    );
    installVirtualApp(
      nodeA,
      nodeB,
      nodeC,
      (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
    );
  });

  it("will uninstall virtual and install virtual successfully when called by different nodes", async done => {
    let completedEvents = 0;
    const registerEvent = () => {
      completedEvents += 1;
      if (completedEvents === 2) {
        done();
      }
    };
    nodeA.once(NODE_EVENTS.INSTALL_VIRTUAL, () => {
      registerEvent();
    });

    nodeA.once(NODE_EVENTS.UNINSTALL_VIRTUAL, () => {
      registerEvent();
    });

    nodeC.rpcRouter.dispatch(
      constructUninstallVirtualRpc(
        installedAppInstanceId,
        nodeB.publicIdentifier
      )
    );
    installVirtualApp(
      nodeA,
      nodeB,
      nodeC,
      (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
    );
  });
});
