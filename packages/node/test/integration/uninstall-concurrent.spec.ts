import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import {
  InstallMessage,
  NODE_EVENTS,
  ProposeMessage,
  UninstallMessage
} from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  constructUninstallRpc,
  createChannel,
  makeInstallCall,
  makeProposeCall
} from "./utils";

expect.extend({ toBeLt });

jest.setTimeout(7500);

const { TicTacToeApp } = global["networkContext"] as NetworkContextForTestSuite;

describe("Node method follows spec - uninstall", () => {
  let multisigAddress: string;
  let nodeA: Node;
  let nodeB: Node;

  describe("Should be able to successfully uninstall apps concurrently", () => {
    beforeEach(async () => {
      const context: SetupContext = await setup(global);
      nodeA = context["A"].node;
      nodeB = context["B"].node;

      multisigAddress = await createChannel(nodeA, nodeB);
    });

    it("uninstall apps with ETH concurrently", async done => {
      const appIds: string[] = [];
      let uninstalledApps = 0;
      await collateralizeChannel(
        multisigAddress,
        nodeA,
        nodeB,
        parseEther("2") // We are depositing in 2 and use 1 for each concurrent app
      );

      nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, (msg: ProposeMessage) => {
        makeInstallCall(nodeB, msg.data.appInstanceId);
      });

      nodeA.on(NODE_EVENTS.INSTALL, (msg: InstallMessage) => {
        appIds.push(msg.data.params.appInstanceId);
      });

      const proposeRpc = makeProposeCall(
        nodeB,
        TicTacToeApp,
        /* initialState */ undefined,
        One,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        One,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      nodeA.rpcRouter.dispatch(proposeRpc);
      nodeA.rpcRouter.dispatch(proposeRpc);

      while (appIds.length !== 2) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      nodeA.rpcRouter.dispatch(constructUninstallRpc(appIds[0]));
      nodeA.rpcRouter.dispatch(constructUninstallRpc(appIds[1]));

      // NOTE: nodeA does not ever emit this event
      nodeB.on(NODE_EVENTS.UNINSTALL, (msg: UninstallMessage) => {
        expect(appIds.includes(msg.data.appInstanceId)).toBe(true);
        uninstalledApps += 1;
        if (uninstalledApps === 2) done();
      });
    });
  });
});
