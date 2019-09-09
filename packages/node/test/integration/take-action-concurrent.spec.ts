import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";
import { parseEther } from "ethers/utils";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import {
  InstallMessage,
  NODE_EVENTS,
  ProposeMessage,
  UninstallMessage,
  UpdateStateMessage
} from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import { validAction } from "./tic-tac-toe";
import {
  collateralizeChannel,
  constructTakeActionRpc,
  createChannel,
  makeInstallCall,
  makeProposeCall
} from "./utils";

expect.extend({ toBeLt });

jest.setTimeout(7500);

describe("Node method follows spec - toke action", () => {
  let multisigAddress: string;
  let nodeA: Node;
  let nodeB: Node;

  describe("Should be able to successfully take action on apps concurrently", () => {
    beforeEach(async () => {
      const context: SetupContext = await setup(global);
      nodeA = context["A"].node;
      nodeB = context["B"].node;

      multisigAddress = await createChannel(nodeA, nodeB);
    });

    it("can take actions on two different apps concurrently", async done => {
      const appIds: string[] = [];
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

      const proposeRpc = () =>
        makeProposeCall(
          nodeB,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
          /* initialState */ undefined,
          One,
          CONVENTION_FOR_ETH_TOKEN_ADDRESS,
          One,
          CONVENTION_FOR_ETH_TOKEN_ADDRESS
        );

      nodeA.rpcRouter.dispatch(proposeRpc());
      nodeA.rpcRouter.dispatch(proposeRpc());

      while (appIds.length !== 2) {
        await new Promise(resolve => setTimeout(resolve, 20));
      }

      let appsTakenActionOn = 0;
      nodeB.on(NODE_EVENTS.UPDATE_STATE, async (msg: UpdateStateMessage) => {
        appsTakenActionOn += 1;
        if (appsTakenActionOn === 2) {
          done();
        }
      });

      nodeA.rpcRouter.dispatch(constructTakeActionRpc(appIds[0], validAction));
      nodeA.rpcRouter.dispatch(constructTakeActionRpc(appIds[1], validAction));
    });
  });
});