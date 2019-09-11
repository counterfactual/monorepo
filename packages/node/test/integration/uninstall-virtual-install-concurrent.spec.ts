import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { NODE_EVENTS, ProposeMessage } from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  constructUninstallVirtualRpc,
  createChannel,
  installVirtualApp,
  makeInstallCall,
  makeProposeCall
} from "./utils";

expect.extend({ toBeLt });

jest.setTimeout(7500);

describe("Node method follows spec when happening concurrently - install / uninstall virtual", () => {
  let multisigAddressAB: string;
  let multisigAddressBC: string;
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;
  let installedAppInstanceId: string;
  let installCall;

  describe("NodeA can uninstall virtual app with NodeC and install regular app with nodeB concurrently", () => {
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

      const appDef = (global["networkContext"] as NetworkContextForTestSuite)
        .TicTacToeApp;

      installCall = makeProposeCall(
        nodeB,
        appDef,
        /* initialState */ undefined,
        One,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        One,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      // install the first app
      installedAppInstanceId = await installVirtualApp(
        nodeA,
        nodeB,
        nodeC,
        appDef,
        undefined,
        CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        One,
        One
      );
      expect(installedAppInstanceId).toBeDefined();
    });

    // FAILING -- skip for now
    it.skip("install app with ETH then uninstall and install apps simultaneously from the same node", async done => {
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

      // note: if this is on nodeA, test fails with timeout
      nodeC.once(NODE_EVENTS.UNINSTALL_VIRTUAL, () => {
        completedActions += 1;
        if (completedActions === 2) {
          done();
        }
      });

      nodeA.rpcRouter.dispatch(installCall);
      nodeA.rpcRouter.dispatch(
        constructUninstallVirtualRpc(
          installedAppInstanceId,
          nodeB.publicIdentifier
        )
      );
    });

    it("install app with ETH then uninstall virtual and install apps simultaneously from separate nodes", async done => {
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

      nodeA.once(NODE_EVENTS.UNINSTALL_VIRTUAL, () => {
        completedActions += 1;
        if (completedActions === 2) {
          done();
        }
      });

      nodeA.rpcRouter.dispatch(installCall);
      nodeC.rpcRouter.dispatch(
        constructUninstallVirtualRpc(
          installedAppInstanceId,
          nodeB.publicIdentifier
        )
      );
    });
  });
});