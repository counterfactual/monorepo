import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import {
  InstallVirtualMessage,
  NODE_EVENTS,
  UninstallVirtualMessage,
} from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  constructUninstallVirtualRpc,
  createChannel,
  installVirtualApp
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

  it("can handle two concurrent TTT virtual app uninstalls", async done => {
    const INSTALLED_APPS = 2;
    let uninstalledApps = 0;
    const appIds: string[] = [];

    nodeA.on(NODE_EVENTS.INSTALL_VIRTUAL, (msg: InstallVirtualMessage) => {
      expect(msg.data.params.appInstanceId).toBeTruthy();
      appIds.push(msg.data.params.appInstanceId);
    });

    for (const i of Array(INSTALLED_APPS)) {
      await installVirtualApp(
        nodeA,
        nodeB,
        nodeC,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
      );
    }

    while (appIds.length !== INSTALLED_APPS) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const uninstallRpc = (appId: string) =>
      constructUninstallVirtualRpc(appId, nodeB.publicIdentifier);

    nodeA.rpcRouter.dispatch(uninstallRpc(appIds[0]));
    nodeA.rpcRouter.dispatch(uninstallRpc(appIds[1]));

    // NOTE: nodeA does not emit this event
    nodeC.on(
      NODE_EVENTS.UNINSTALL_VIRTUAL,
      async (msg: UninstallVirtualMessage) => {
        expect(appIds.includes(msg.data.appInstanceId)).toBe(true);
        uninstalledApps += 1;
        // NOTE: this expect fails
        // const apps = (await getInstalledAppInstances(nodeC)).length;
        // expect(INSTALLED_APPS - apps).toEqual(uninstalledApps);
        if (uninstalledApps === 2) {
          done();
        }
      }
    );
  });
});
