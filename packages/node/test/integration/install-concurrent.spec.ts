import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { One } from "ethers/constants";
import { bigNumberify } from "ethers/utils";

import { Node } from "../../src";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../src/constants";
import {
  NODE_EVENTS,
  ProposeMessage,
  ProposeVirtualMessage
} from "../../src/types";
import { toBeLt } from "../machine/integration/bignumber-jest-matcher";

import { setup, SetupContext } from "./setup";
import {
  collateralizeChannel,
  createChannel,
  getInstalledAppInstances,
  installTTTVirtual,
  makeInstallCall,
  makeProposeCall,
  makeVirtualProposeCall
} from "./utils";

expect.extend({ toBeLt });

const delay = async (ms: number) => {
  await new Promise(resolve => setTimeout(resolve, ms));
};

describe("Node method follows spec - install", () => {
  let multisigAddressAB: string;
  let multisigAddressBC: string;
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it, " +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      beforeEach(async () => {
        const context: SetupContext = await setup(global);
        nodeA = context["A"].node;
        nodeB = context["B"].node;

        multisigAddressAB = await createChannel(nodeA, nodeB);
      });

      jest.setTimeout(7000);

      it("install apps with ETH concurrently", async done => {
        await collateralizeChannel(
          nodeA,
          nodeB,
          multisigAddressAB,
          bigNumberify(3)
        );

        nodeB.on(NODE_EVENTS.PROPOSE_INSTALL, async (msg: ProposeMessage) => {
          makeInstallCall(nodeB, msg.data.appInstanceId);
        });

        const proposeRpc = () =>
          makeProposeCall(
            nodeB,
            (global["networkContext"] as NetworkContextForTestSuite)
              .TicTacToeApp,
            /* initialState */ undefined,
            One,
            CONVENTION_FOR_ETH_TOKEN_ADDRESS,
            One,
            CONVENTION_FOR_ETH_TOKEN_ADDRESS
          );
        await Promise.all([
          nodeA.rpcRouter.dispatch(proposeRpc()),
          nodeA.rpcRouter.dispatch(proposeRpc())
        ]);

        const pollApps = async () => {
          while ((await getInstalledAppInstances(nodeA)).length < 2) {
            await delay(100);
          }
        };

        await pollApps();
        const aApps = await getInstalledAppInstances(nodeA);
        const bApps = await getInstalledAppInstances(nodeB);
        expect(aApps).toEqual(bApps);
        done();
      });
    }
  );

  describe(
    "Node A gets app install virtual proposal, sends to node C, C approves it, installs it, " +
      "sends acks back to A, A installs it, both nodes have the same virtual app instance",
    () => {
      beforeEach(async () => {
        const context: SetupContext = await setup(global, true);
        nodeA = context["A"].node;
        nodeB = context["B"].node;
        nodeC = context["C"].node;

        multisigAddressAB = await createChannel(nodeA, nodeB);
        multisigAddressBC = await createChannel(nodeB, nodeC);
      });

      jest.setTimeout(7000);

      it("install virtual apps with ETH concurrently", async done => {
        // collateralize all nodes in both channels
        await collateralizeChannel(
          nodeA,
          nodeB,
          multisigAddressAB,
          bigNumberify(3)
        );

        await collateralizeChannel(
          nodeB,
          nodeC,
          multisigAddressBC,
          bigNumberify(3)
        );

        expect(multisigAddressAB).toBeDefined();
        expect(multisigAddressBC).toBeDefined();

        nodeC.on(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          async (msg: ProposeVirtualMessage) => {
            await installTTTVirtual(
              nodeC,
              msg.data.appInstanceId,
              nodeB.publicIdentifier
            );
          }
        );

        const proposeVirtualRpc = () =>
          makeVirtualProposeCall(
            nodeA,
            nodeC,
            nodeB,
            (global["networkContext"] as NetworkContextForTestSuite)
              .TicTacToeApp
          );
        await Promise.all([proposeVirtualRpc(), proposeVirtualRpc()]);

        const pollApps = async () => {
          while ((await getInstalledAppInstances(nodeA)).length < 2) {
            await delay(100);
          }
        };

        await pollApps();
        const aApps = await getInstalledAppInstances(nodeA);
        const bApps = await getInstalledAppInstances(nodeB);
        expect(aApps).toEqual(bApps);
        done();
      });
    }
  );
});
