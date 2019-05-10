import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import { xkeyKthAddress } from "../../src/machine";
import {
  InstallVirtualMessage,
  NODE_EVENTS,
  ProposeVirtualMessage,
  UninstallMessage
} from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  confirmProposedVirtualAppInstanceOnNode,
  generateUninstallVirtualRequest,
  getApps,
  getMultisigCreationTransactionHash,
  getProposedAppInstances,
  makeInstallVirtualRequest,
  makeTTTVirtualAppInstanceProposalReq
} from "./utils";

describe("Node method follows spec - uninstall virtual", () => {
  jest.setTimeout(10000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let nodeA: Node;
  let nodeB: Node;
  let nodeC: Node;

  beforeAll(async () => {
    const result = await setup(global, true);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
    nodeC = result.nodeC!;
    firebaseServiceFactory = result.firebaseServiceFactory;
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });
  describe(
    "Node A and C install a Virtual AppInstance through an intermediary Node B," +
      "then Node A uninstalls the installed AppInstance",
    () => {
      it("sends uninstall ", async done => {
        const stateEncoding =
          "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)";
        const actionEncoding =
          "tuple(uint8 actionType, uint256 playX, uint256 playY, tuple(uint8 winClaimType, uint256 idx) winClaim)";

        const initialState = {
          players: [
            xkeyKthAddress(nodeA.publicIdentifier, 0), // <-- winner
            xkeyKthAddress(nodeC.publicIdentifier, 0)
          ],
          turnNum: 0,
          winner: 1, // Hard-coded winner for test
          board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        };

        nodeA.once(NODE_EVENTS.CREATE_CHANNEL, async () => {
          nodeC.once(NODE_EVENTS.CREATE_CHANNEL, async () => {
            const installVirtualAppInstanceProposalRequest = makeTTTVirtualAppInstanceProposalReq(
              nodeC.publicIdentifier,
              global["networkContext"].TicTacToe,
              initialState,
              {
                stateEncoding,
                actionEncoding
              },
              [nodeB.publicIdentifier]
            );

            nodeC.on(
              NODE_EVENTS.UNINSTALL_VIRTUAL,
              async (msg: UninstallMessage) => {
                expect(
                  await getApps(nodeA, APP_INSTANCE_STATUS.INSTALLED)
                ).toEqual([]);
                expect(
                  await getApps(nodeC, APP_INSTANCE_STATUS.INSTALLED)
                ).toEqual([]);
                done();
              }
            );

            nodeA.on(
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

                expect(virtualAppInstanceNodeA).toEqual(
                  virtualAppInstanceNodeC
                );

                const uninstallReq = generateUninstallVirtualRequest(
                  msg.data.params.appInstanceId,
                  nodeB.publicIdentifier
                );
                nodeA.emit(uninstallReq.type, uninstallReq);
              }
            );

            nodeC.on(
              NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
              async (msg: ProposeVirtualMessage) => {
                const proposedAppInstanceA = (await getProposedAppInstances(
                  nodeA
                ))[0];
                const proposedAppInstanceC = (await getProposedAppInstances(
                  nodeC
                ))[0];

                confirmProposedVirtualAppInstanceOnNode(
                  installVirtualAppInstanceProposalRequest.params,
                  proposedAppInstanceA
                );
                confirmProposedVirtualAppInstanceOnNode(
                  installVirtualAppInstanceProposalRequest.params,
                  proposedAppInstanceC
                );

                expect(proposedAppInstanceC.proposedByIdentifier).toEqual(
                  nodeA.publicIdentifier
                );
                expect(proposedAppInstanceA.id).toEqual(
                  proposedAppInstanceC.id
                );

                const installVirtualReq = makeInstallVirtualRequest(
                  msg.data.appInstanceId,
                  msg.data.params.intermediaries
                );
                nodeC.emit(installVirtualReq.type, installVirtualReq);
              }
            );

            const response = await nodeA.call(
              installVirtualAppInstanceProposalRequest.type,
              installVirtualAppInstanceProposalRequest
            );
            const appInstanceId = (response.result as NodeTypes.ProposeInstallVirtualResult)
              .appInstanceId;
            expect(appInstanceId).toBeDefined();
          });
          await getMultisigCreationTransactionHash(nodeB, [
            nodeB.publicIdentifier,
            nodeC.publicIdentifier
          ]);
        });
        await getMultisigCreationTransactionHash(nodeA, [
          nodeA.publicIdentifier,
          nodeB.publicIdentifier
        ]);
      });
    }
  );
});
