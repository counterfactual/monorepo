import { Node as NodeTypes } from "@counterfactual/types";
import { One, Zero } from "ethers/constants";

import { Node } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import {
  InstallVirtualMessage,
  NODE_EVENTS,
  ProposeVirtualMessage
} from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  collateralizeChannel,
  confirmProposedVirtualAppInstanceOnNode as confirmProposedVirtualAppInstance,
  createChannel,
  getApps,
  getProposedAppInstances,
  installTTTVirtual,
  makeTTTVirtualProposal
} from "./utils";

describe("Node method follows spec - proposeInstallVirtual", () => {
  jest.setTimeout(20000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  beforeAll(async () => {
    const result = await setup(global, true, true);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    nodeC = result.nodeC!;
    firebaseServiceFactory = result.firebaseServiceFactory;
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });
  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. All Nodes confirm receipt of proposal",
    () => {
      it("sends proposal with non-null initial state", async done => {
        const multisigAddressAB = await createChannel(nodeA, nodeB);
        const multisigAddressBC = await createChannel(nodeB, nodeC);

        await collateralizeChannel(nodeA, nodeB, multisigAddressAB);
        await collateralizeChannel(nodeB, nodeC, multisigAddressBC);

        let proposalParams: NodeTypes.ProposeInstallVirtualParams;
        nodeA.once(
          NODE_EVENTS.INSTALL_VIRTUAL,
          async (msg: InstallVirtualMessage) => {
            const [virtualAppNodeA] = await getApps(
              nodeA,
              APP_INSTANCE_STATUS.INSTALLED
            );

            const [virtualAppNodeC] = await getApps(
              nodeC,
              APP_INSTANCE_STATUS.INSTALLED
            );

            expect(virtualAppNodeA.myDeposit).toEqual(One);
            expect(virtualAppNodeA.peerDeposit).toEqual(Zero);
            expect(virtualAppNodeC.myDeposit).toEqual(Zero);
            expect(virtualAppNodeC.peerDeposit).toEqual(One);

            delete virtualAppNodeA.myDeposit;
            delete virtualAppNodeA.peerDeposit;
            delete virtualAppNodeC.myDeposit;
            delete virtualAppNodeC.peerDeposit;

            expect(virtualAppNodeA).toEqual(virtualAppNodeC);
            done();
          }
        );

        nodeC.once(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          async (msg: ProposeVirtualMessage) => {
            const { appInstanceId } = msg.data;
            const { intermediaries } = msg.data.params;
            const [proposedAppNodeA] = await getProposedAppInstances(nodeA);
            const [proposedAppNodeC] = await getProposedAppInstances(nodeC);

            confirmProposedVirtualAppInstance(proposalParams, proposedAppNodeA);
            confirmProposedVirtualAppInstance(
              proposalParams,
              proposedAppNodeC,
              true
            );

            expect(proposedAppNodeC.proposedByIdentifier).toEqual(
              nodeA.publicIdentifier
            );
            expect(proposedAppNodeA.id).toEqual(proposedAppNodeC.id);
            installTTTVirtual(nodeC, appInstanceId, intermediaries);
          }
        );

        const result = await makeTTTVirtualProposal(nodeA, nodeC, nodeB);
        proposalParams = result.params as NodeTypes.ProposeInstallVirtualParams;
      });
    }
  );
});
