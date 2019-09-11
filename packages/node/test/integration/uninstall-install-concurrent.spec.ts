import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { InstallMessage, NODE_EVENTS, ProposeMessage } from "../../src/types";
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

describe("Node method follows spec when happening concurrently - install / uninstall", () => {
  let multisigAddress: string;
  let nodeA: Node;
  let nodeB: Node;
  let installedAppInstanceId: string;
  let installCall;

  describe("NodeA can uninstall and install an app with nodeB concurrently", () => {
    beforeEach(async () => {
      const context: SetupContext = await setup(global);
      nodeA = context["A"].node;
      nodeB = context["B"].node;

      multisigAddress = await createChannel(nodeA, nodeB);

      await collateralizeChannel(
        multisigAddress,
        nodeA,
        nodeB,
        parseEther("2") // We are depositing in 2 and use 1 for each concurrent app
      );

      installCall = makeProposeCall(
        nodeB,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
        /* initialState */ undefined,
        One,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        One,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      // install the first app
      installedAppInstanceId = await new Promise(async resolve => {
        nodeB.once(NODE_EVENTS.PROPOSE_INSTALL, (msg: ProposeMessage) => {
          makeInstallCall(nodeB, msg.data.appInstanceId);
        });

        nodeA.once(NODE_EVENTS.INSTALL, (msg: InstallMessage) => {
          // save the first installed appId
          resolve(msg.data.params.appInstanceId);
        });

        await nodeA.rpcRouter.dispatch(installCall);
      });
    });

    // FAILING -- skip for now
    it("install app with ETH then uninstall and install apps simultaneously from the same node", async done => {
      let completedActions = 0;

      nodeB.once(NODE_EVENTS.PROPOSE_INSTALL, (msg: ProposeMessage) => {
        makeInstallCall(nodeB, msg.data.appInstanceId);
      });

      nodeA.once(NODE_EVENTS.INSTALL, () => {
        completedActions += 1;
        if (completedActions === 2) {
          done();
        }
      });

      // if this is on nodeA, test fails
      nodeB.once(NODE_EVENTS.UNINSTALL, () => {
        completedActions += 1;
        if (completedActions === 2) {
          done();
        }
      });

      const installCall = makeProposeCall(
        nodeB,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
        /* initialState */ undefined,
        One,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        One,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      nodeA.rpcRouter.dispatch(installCall);
      nodeA.rpcRouter.dispatch(constructUninstallRpc(installedAppInstanceId));
    });

    it("install app with ETH then uninstall and install apps simultaneously from separate nodes", async done => {
      let completedActions = 0;

      nodeB.once(NODE_EVENTS.PROPOSE_INSTALL, (msg: ProposeMessage) => {
        makeInstallCall(nodeB, msg.data.appInstanceId);
      });

      nodeA.once(NODE_EVENTS.INSTALL, () => {
        completedActions += 1;
        if (completedActions === 2) {
          done();
        }
      });

      // if this is on nodeB, test fails
      nodeA.once(NODE_EVENTS.UNINSTALL, () => {
        completedActions += 1;
        if (completedActions === 2) {
          done();
        }
      });

      const installCall = makeProposeCall(
        nodeB,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
        /* initialState */ undefined,
        One,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        One,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      nodeA.rpcRouter.dispatch(installCall);
      nodeB.rpcRouter.dispatch(constructUninstallRpc(installedAppInstanceId));
    });
  });
});
