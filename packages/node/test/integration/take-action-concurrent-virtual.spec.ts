import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import {
  InstallVirtualMessage,
  NODE_EVENTS,
  UpdateStateMessage
} from "../../src/types";
import { toBeLt } from "../engine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import { validAction } from "./tic-tac-toe";
import {
  collateralizeChannel,
  constructTakeActionRpc,
  createChannel,
  installVirtualApp
} from "./utils";

expect.extend({ toBeLt });

jest.setTimeout(15000);

describe("Concurrently taking action on virtual apps without issue", () => {
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

  it("can handle two concurrent TTT virtual app take actions", async done => {
    const INSTALLED_APPS = 2;
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
      await new Promise(resolve => setTimeout(resolve, 20));
    }

    let appsTakenActionOn = 0;
    nodeC.on(NODE_EVENTS.UPDATE_STATE, async (msg: UpdateStateMessage) => {
      appsTakenActionOn += 1;
      if (appsTakenActionOn === 2) {
        done();
      }
    });

    const takeActionReq = (appId: string) =>
      constructTakeActionRpc(appId, validAction);

    nodeA.rpcRouter.dispatch(takeActionReq(appIds[0]));
    nodeA.rpcRouter.dispatch(takeActionReq(appIds[1]));
  });
});
