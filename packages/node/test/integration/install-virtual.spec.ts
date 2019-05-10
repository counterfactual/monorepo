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
  confirmProposedVirtualAppInstanceOnNode,
  createChannel,
  getApps,
  getProposedAppInstances,
  makeInstallVirtualRequest,
  makeTTTVirtualProposal
} from "./utils";

describe("Node method follows spec - proposeInstallVirtual", () => {
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
            const virtualAppInstanceNodeA = (await getApps(
              nodeA,
              APP_INSTANCE_STATUS.INSTALLED
            ))[0];

            const virtualAppInstanceNodeC = (await getApps(
              nodeC,
              APP_INSTANCE_STATUS.INSTALLED
            ))[0];

            expect(virtualAppInstanceNodeA.myDeposit).toEqual(One);
            expect(virtualAppInstanceNodeA.peerDeposit).toEqual(Zero);
            expect(virtualAppInstanceNodeC.myDeposit).toEqual(Zero);
            expect(virtualAppInstanceNodeC.peerDeposit).toEqual(One);

            delete virtualAppInstanceNodeA.myDeposit;
            delete virtualAppInstanceNodeA.peerDeposit;
            delete virtualAppInstanceNodeC.myDeposit;
            delete virtualAppInstanceNodeC.peerDeposit;

            expect(virtualAppInstanceNodeA).toEqual(virtualAppInstanceNodeC);
            done();
          }
        );

        nodeC.once(
          NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
          async (msg: ProposeVirtualMessage) => {
            const proposedAppInstanceA = (await getProposedAppInstances(
              nodeA
            ))[0];
            const proposedAppInstanceC = (await getProposedAppInstances(
              nodeC
            ))[0];

            confirmProposedVirtualAppInstanceOnNode(
              proposalParams,
              proposedAppInstanceA
            );
            confirmProposedVirtualAppInstanceOnNode(
              proposalParams,
              proposedAppInstanceC,
              true
            );

            expect(proposedAppInstanceC.proposedByIdentifier).toEqual(
              nodeA.publicIdentifier
            );
            expect(proposedAppInstanceA.id).toEqual(proposedAppInstanceC.id);

            const installVirtualReq = makeInstallVirtualRequest(
              msg.data.appInstanceId,
              msg.data.params.intermediaries
            );
            nodeC.emit(installVirtualReq.type, installVirtualReq);
          }
        );

        const result = await makeTTTVirtualProposal(nodeA, nodeC, nodeB);
        proposalParams = result.params as NodeTypes.ProposeInstallVirtualParams;
      });
    }
  );
});
