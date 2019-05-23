import { INVALID_ACTION, Node } from "../../src";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  createChannel,
  generateTakeActionRequest,
  installTTTApp
} from "./utils";

describe("Node method follows spec - fails with improper action taken", () => {
  let nodeA: Node;
  let nodeB: Node;
  let firebaseServiceFactory: LocalFirebaseServiceFactory;

  beforeAll(async () => {
    const result = await setup(global);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    firebaseServiceFactory = result.firebaseServiceFactory;
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  describe("Node A and B install an AppInstance, Node A takes invalid action", () => {
    it("can't take invalid action", async done => {
      const validAction = {
        actionType: 1,
        playX: 0,
        playY: 0,
        winClaim: {
          winClaimType: 0,
          idx: 0
        }
      };
      await createChannel(nodeA, nodeB);
      const appInstanceId = await installTTTApp(nodeA, nodeB);

      const takeActionReq = generateTakeActionRequest(
        appInstanceId,
        validAction
      );

      try {
        await nodeA.call(takeActionReq.type, takeActionReq);
      } catch (e) {
        expect(e.toString()).toMatch(INVALID_ACTION);
        done();
      }
    });
  });
});
