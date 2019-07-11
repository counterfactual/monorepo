import { Node } from "../../src";
import { NODE_EVENTS, UninstallMessage } from "../../src/types";

import { setup, SetupContext } from "./setup";
import {
  createChannel,
  generateUninstallRequest,
  getInstalledAppInstances,
  installTTTApp
} from "./utils";

describe("Node method follows spec - uninstall", () => {
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global);
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

      const appInstanceId = await installTTTApp(nodeA, nodeB, initialState);

      nodeB.once(NODE_EVENTS.UNINSTALL, async (msg: UninstallMessage) => {
        expect(msg.data.appInstanceId).toBe(appInstanceId);

        expect(await getInstalledAppInstances(nodeB)).toEqual([]);
        done();
      });

      await nodeA.rpcRouter.dispatch(generateUninstallRequest(appInstanceId));

      expect(await getInstalledAppInstances(nodeA)).toEqual([]);
    });
  });
});
