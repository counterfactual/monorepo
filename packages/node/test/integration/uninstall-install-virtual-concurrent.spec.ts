import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { InstallMessage, NODE_EVENTS, ProposeMessage } from "../../src/types";
import { toBeLt } from "../engine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  constructUninstallRpc,
  createChannel,
  installVirtualApp,
  makeInstallCall,
  makeProposeCall
} from "./utils";

expect.extend({ toBeLt });

jest.setTimeout(7500);

describe("Node method follows spec when happening concurrently - install virtual / uninstall", () => {
  let multisigAddressAB: string;
  let multisigAddressBC: string;
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;
  let installedAppInstanceId: string;

  describe("NodeA can uninstall regular app with NodeB and install virtual app with nodeC concurrently", () => {
    beforeEach(async () => {
      const context: SetupContext = await setup(global, true);
      nodeA = context["A"].node;
      nodeB = context["B"].node;
      nodeC = context["C"].node;

      multisigAddressAB = await createChannel(nodeA, nodeB);
      multisigAddressBC = await createChannel(nodeB, nodeC);

      // collateralize both channels
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

      // install regular app
      installedAppInstanceId = await new Promise(async resolve => {
        nodeB.once(NODE_EVENTS.PROPOSE_INSTALL, (msg: ProposeMessage) => {
          makeInstallCall(nodeB, msg.data.appInstanceId);
        });

        nodeA.once(NODE_EVENTS.INSTALL, (msg: InstallMessage) => {
          resolve(msg.data.params.appInstanceId);
        });

        await nodeA.rpcRouter.dispatch(
          makeProposeCall(
            nodeB,
            appDef,
            undefined,
            One,
            CONVENTION_FOR_ETH_TOKEN_ADDRESS,
            One,
            CONVENTION_FOR_ETH_TOKEN_ADDRESS
          )
        );
      });
    });

    it("nodeA calls uninstall and install virtual", async done => {
      let completedActions = 0;

      nodeB.once(NODE_EVENTS.UNINSTALL, () => {
        completedActions += 1;
        if (completedActions === 2) {
          done();
        }
      });

      nodeA.once(NODE_EVENTS.INSTALL_VIRTUAL, () => {
        completedActions += 1;
        if (completedActions === 2) {
          done();
        }
      });

      nodeA.rpcRouter.dispatch(constructUninstallRpc(installedAppInstanceId));
      installVirtualApp(
        nodeA,
        nodeB,
        nodeC,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
      );
    });

    it("separate nodes make the uninstall and install virtual calls", async done => {
      let completedActions = 0;

      nodeA.once(NODE_EVENTS.UNINSTALL, () => {
        completedActions += 1;
        if (completedActions === 2) {
          done();
        }
      });

      nodeA.once(NODE_EVENTS.INSTALL_VIRTUAL, () => {
        completedActions += 1;
        if (completedActions === 2) {
          done();
        }
      });

      nodeB.rpcRouter.dispatch(constructUninstallRpc(installedAppInstanceId));
      installVirtualApp(
        nodeA,
        nodeB,
        nodeC,
        (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
      );
    });
  });
});
