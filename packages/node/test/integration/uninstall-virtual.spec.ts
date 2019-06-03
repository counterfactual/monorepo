// @ts-ignore - firebase-server depends on node being transpiled first, circular dependency
import { LocalFirebaseServiceFactory } from "@counterfactual/firebase-server";

import { Node } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import { NODE_EVENTS, UninstallMessage } from "../../src/types";

import { setup } from "./setup";
import {
  collateralizeChannel,
  createChannel,
  generateUninstallVirtualRequest,
  getApps,
  installTTTAppVirtual
} from "./utils";

describe("Node method follows spec - uninstall virtual", () => {
  jest.setTimeout(10000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  beforeAll(async () => {
    const result = await setup(global, true);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    nodeC = result.nodeC!;
    firebaseServiceFactory = result.firebaseServiceFactory;
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
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
