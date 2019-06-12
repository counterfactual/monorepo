import { Node } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import { NODE_EVENTS, UninstallMessage } from "../../src/types";

import { setup, SetupContext } from "./setup";
import {
  createChannel,
  generateUninstallRequest,
  getApps,
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
        turnNum: 0,
        winner: 1, // Hard-coded winner for test
        board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
      };

      await createChannel(nodeA, nodeB);
      const appInstanceId = await installTTTApp(nodeA, nodeB, initialState);
      const uninstallReq = generateUninstallRequest(appInstanceId);

      nodeA.emit(uninstallReq.type, uninstallReq);
      nodeB.on(NODE_EVENTS.UNINSTALL, async (msg: UninstallMessage) => {
        expect(await getApps(nodeA, APP_INSTANCE_STATUS.INSTALLED)).toEqual([]);
        expect(await getApps(nodeB, APP_INSTANCE_STATUS.INSTALLED)).toEqual([]);
        done();
      });
    });
  });
});
