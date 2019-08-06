import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";

import { Node } from "../../src";
import { NODE_EVENTS, UninstallVirtualMessage } from "../../src/types";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  createChannel,
  generateUninstallVirtualRequest,
  getInstalledAppInstances,
  installVirtualApp
} from "./utils";

jest.setTimeout(10000);

describe("Node method follows spec - uninstall virtual", () => {
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global, true, true);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    nodeC = context["C"].node;
  });

  describe(
    "Node A and C install a Virtual AppInstance through an intermediary Node B," +
      "then Node A uninstalls the installed AppInstance",
    () => {
      it("sends uninstall ", async done => {
        const initialState = {
          versionNumber: 0,
          winner: 1, // Hard-coded winner for test
          board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        };

        const multisigAddressAB = await createChannel(nodeA, nodeB);
        const multisigAddressBC = await createChannel(nodeB, nodeC);

        await collateralizeChannel(nodeA, nodeB, multisigAddressAB);
        await collateralizeChannel(nodeB, nodeC, multisigAddressBC);

        const appInstanceId = await installVirtualApp(
          nodeA,
          nodeB,
          nodeC,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
          initialState
        );

        nodeC.once(
          NODE_EVENTS.UNINSTALL_VIRTUAL,
          async (msg: UninstallVirtualMessage) => {
            expect(msg.data.appInstanceId).toBe(appInstanceId);
            expect(msg.data.intermediaryIdentifier).toBe(
              nodeB.publicIdentifier
            );

            expect(await getInstalledAppInstances(nodeC)).toEqual([]);

            done();
          }
        );

        await nodeA.rpcRouter.dispatch(
          generateUninstallVirtualRequest(appInstanceId, nodeB.publicIdentifier)
        );

        expect(await getInstalledAppInstances(nodeA)).toEqual([]);
      });
    }
  );
});
