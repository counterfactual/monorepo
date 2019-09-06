import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { InstallMessage, NODE_EVENTS, ProposeMessage } from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  constructUninstallRpc,
  constructUninstallVirtualRpc,
  createChannel,
  installVirtualApp,
  makeInstallCall,
  makeProposeCall
} from "./utils";

expect.extend({ toBeLt });

jest.setTimeout(15000);

describe("Concurrently uninstalling virtual and regular applications without issue", () => {
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

  it("can handle a virtual and regular TTT app uninstall", async done => {
    let totalAppsUninstalled = 0;

    // install a regular app
    nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, (msg: ProposeMessage) => {
      makeInstallCall(nodeB, msg.data.appInstanceId);
    });

    const appId = await new Promise(resolve => {
      nodeA.on(NODE_EVENTS.INSTALL, (msg: InstallMessage) => {
        resolve(msg.data.params.appInstanceId);
      });

      nodeA.rpcRouter.dispatch(
        makeProposeCall(
          nodeB,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
          /* initialState */ undefined,
          One,
          CONVENTION_FOR_ETH_TOKEN_ADDRESS,
          One,
          CONVENTION_FOR_ETH_TOKEN_ADDRESS
        )
      );
    });

    // install a virtual app
    const virtualId = await installVirtualApp(
      nodeA,
      nodeB,
      nodeC,
      (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
    );

    // set up uninstall handlers
    nodeC.on(NODE_EVENTS.UNINSTALL_VIRTUAL, () => {
      totalAppsUninstalled += 1;
      if (totalAppsUninstalled === 2) {
        done();
      }
    });
    nodeA.on(NODE_EVENTS.UNINSTALL, () => {
      totalAppsUninstalled += 1;
      if (totalAppsUninstalled === 2) {
        done();
      }
    });

    // uninstall both simultaneously
    nodeA.rpcRouter.dispatch(
      constructUninstallVirtualRpc(virtualId, nodeB.publicIdentifier)
    );
    nodeB.rpcRouter.dispatch(constructUninstallRpc(appId as string));
  });
});
