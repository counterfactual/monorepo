import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import { NODE_EVENTS, ProposeMessage } from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  createChannel,
  makeInstallCall,
  makeProposeCall,
} from "./utils";

expect.extend({ toBeLt });

describe("Node method follows spec - install", () => {
  let multisigAddress: string;
  let nodeA: Node;
  let nodeB: Node;

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it, " +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      beforeEach(async () => {
        const context: SetupContext = await setup(global);
        nodeA = context["A"].node;
        nodeB = context["B"].node;

        multisigAddress = await createChannel(nodeA, nodeB);
      });

      it("install apps with ETH concurrently", async done => {
        await collateralizeChannel(nodeA, nodeB, multisigAddress);

        nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
          await new Promise(resolve => setTimeout(resolve, 1000));
          makeInstallCall(nodeB, msg.data.appInstanceId);
          await new Promise(resolve => setTimeout(resolve, 1000));

          expect(done);
        });

        const proposeRpc = () => makeProposeCall(
          nodeB,
          (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp,
          /* initialState */ undefined,
          One,
          CONVENTION_FOR_ETH_TOKEN_ADDRESS,
          One,
          CONVENTION_FOR_ETH_TOKEN_ADDRESS
        );
        await Promise.all([
          nodeA.rpcRouter.dispatch(proposeRpc()),
          nodeA.rpcRouter.dispatch(proposeRpc())
        ])
      });
    }
  );
});

