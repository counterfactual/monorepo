import { Node } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import { NODE_EVENTS, UninstallMessage } from "../../src/types";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  createChannel,
  generateUninstallVirtualRequest,
  getApps,
  installTTTAppVirtual
} from "./utils";

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
          turnNum: 0,
          winner: 1, // Hard-coded winner for test
          board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        };

        const multisigAddressAB = await createChannel(nodeA, nodeB);
        const multisigAddressBC = await createChannel(nodeB, nodeC);
        await collateralizeChannel(nodeA, nodeB, multisigAddressAB);
        await collateralizeChannel(nodeB, nodeC, multisigAddressBC);

        const appInstanceId = await installTTTAppVirtual(
          nodeA,
          nodeB,
          nodeC,
          initialState
        );

        nodeC.on(
          NODE_EVENTS.UNINSTALL_VIRTUAL,
          async (msg: UninstallMessage) => {
            expect(await getApps(nodeA, APP_INSTANCE_STATUS.INSTALLED)).toEqual(
              []
            );
            expect(await getApps(nodeC, APP_INSTANCE_STATUS.INSTALLED)).toEqual(
              []
            );
            done();
          }
        );

        const uninstallReq = generateUninstallVirtualRequest(
          appInstanceId,
          nodeB.publicIdentifier
        );
        nodeA.emit(uninstallReq.type, uninstallReq);
      });
    }
  );
});
