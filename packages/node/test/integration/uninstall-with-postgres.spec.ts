import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";

import { Node } from "../../src";
import { NODE_EVENTS, UninstallMessage } from "../../src/types";
import { timeout } from "../../src/utils";

import {
  SetupContext,
  setupWithMemoryMessagingAndPostgresStore
} from "./setup";
import {
  constructUninstallRpc,
  createChannel,
  getInstalledAppInstances,
  installApp
} from "./utils";

const { TicTacToeApp } = global["networkContext"] as NetworkContextForTestSuite;

describe("Node method follows spec - uninstall", () => {
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const context: SetupContext = await setupWithMemoryMessagingAndPostgresStore(
      global
    );
    nodeA = context["A"].node;
    nodeB = context["B"].node;
  });

  describe("Node A and B install TTT, then uninstall it", () => {
    it("sends proposal with non-null initial state", async done => {
      const initialState = {
        versionNumber: 0,
        winner: 1, // Hard-coded winner for test
        board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
      };

      await createChannel(nodeA, nodeB);

      // FIXME: There is some timing issue with postgres @snario noticed
      await timeout(2000);

      const [appInstanceId] = await installApp(
        nodeA,
        nodeB,
        TicTacToeApp,
        initialState
      );

      nodeB.once(NODE_EVENTS.UNINSTALL, async (msg: UninstallMessage) => {
        expect(msg.data.appInstanceId).toBe(appInstanceId);

        // FIXME: There is some timing issue with postgres @snario noticed
        await timeout(1000);

        expect(await getInstalledAppInstances(nodeB)).toEqual([]);
        done();
      });

      await nodeA.rpcRouter.dispatch(constructUninstallRpc(appInstanceId));

      expect(await getInstalledAppInstances(nodeA)).toEqual([]);
    });
  });
});
