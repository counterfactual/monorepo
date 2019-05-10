import { Node as NodeTypes } from "@counterfactual/types";
import { One, Zero } from "ethers/constants";

import { Node } from "../../src";
import { ERRORS } from "../../src/methods/errors";
import {
  CreateChannelMessage,
  InstallMessage,
  NODE_EVENTS,
  ProposeMessage
} from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  collateralizeChannel,
  confirmProposedAppInstanceOnNode,
  getInstalledAppInstances,
  getMultisigCreationTransactionHash,
  getProposedAppInstanceInfo,
  makeInstallProposalRequest,
  makeInstallRequest
} from "./utils";

describe("Node method follows spec - proposeInstall", () => {
  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const result = await setup(global);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    firebaseServiceFactory = result.firebaseServiceFactory;
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it, " +
      "sends acks back to A, A installs it, both nodes have the same app instance",
    () => {
      it("sends proposal with non-null initial state", async done => {
        nodeA.on(
          NODE_EVENTS.CREATE_CHANNEL,
          async (msg: CreateChannelMessage) => {
            expect(await getInstalledAppInstances(nodeA)).toEqual([]);
            expect(await getInstalledAppInstances(nodeB)).toEqual([]);
            await collateralizeChannel(nodeA, nodeB, msg.data.multisigAddress);
            let appInstanceId;

            // second, an app instance must be proposed to be installed into that channel
            const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
              nodeB.publicIdentifier,
              false,
              One,
              Zero
            );

            // node B then decides to approve the proposal
            nodeB.on(
              NODE_EVENTS.PROPOSE_INSTALL,
              async (msg: ProposeMessage) => {
                confirmProposedAppInstanceOnNode(
                  appInstanceInstallationProposalRequest.params,
                  await getProposedAppInstanceInfo(nodeA, appInstanceId)
                );

                // some approval logic happens in this callback, we proceed
                // to approve the proposal, and install the app instance
                const installRequest = makeInstallRequest(
                  msg.data.appInstanceId
                );
                nodeB.emit(installRequest.type, installRequest);
              }
            );

            nodeA.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
              const appInstanceNodeA = (await getInstalledAppInstances(
                nodeA
              ))[0];
              const appInstanceNodeB = (await getInstalledAppInstances(
                nodeB
              ))[0];

              expect(appInstanceNodeA.myDeposit).toEqual(One);
              expect(appInstanceNodeA.peerDeposit).toEqual(Zero);
              expect(appInstanceNodeB.myDeposit).toEqual(Zero);
              expect(appInstanceNodeB.peerDeposit).toEqual(One);

              delete appInstanceNodeA.myDeposit;
              delete appInstanceNodeA.peerDeposit;
              delete appInstanceNodeB.myDeposit;
              delete appInstanceNodeB.peerDeposit;

              expect(appInstanceNodeA).toEqual(appInstanceNodeB);
              done();
            });

            const response = await nodeA.call(
              appInstanceInstallationProposalRequest.type,
              appInstanceInstallationProposalRequest
            );
            appInstanceId = (response.result as NodeTypes.ProposeInstallResult)
              .appInstanceId;
          }
        );
        await getMultisigCreationTransactionHash(nodeA, [
          nodeA.publicIdentifier,
          nodeB.publicIdentifier
        ]);
      });

      it("sends proposal with null initial state", async () => {
        const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
          nodeB.publicIdentifier,
          true
        );

        expect(
          nodeA.call(
            appInstanceInstallationProposalRequest.type,
            appInstanceInstallationProposalRequest
          )
        ).rejects.toEqual(ERRORS.NULL_INITIAL_STATE_FOR_PROPOSAL);
      });
    }
  );
});
