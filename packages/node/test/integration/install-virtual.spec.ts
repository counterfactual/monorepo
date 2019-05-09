import { Node as NodeTypes } from "@counterfactual/types";
import { One, Zero } from "ethers/constants";

import { Node } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import {
  CreateChannelMessage,
  InstallVirtualMessage,
  NODE_EVENTS,
  ProposeVirtualMessage
} from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  collateralizeChannel,
  confirmProposedVirtualAppInstanceOnNode,
  getApps,
  getMultisigCreationTransactionHash,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest,
  makeInstallVirtualRequest,
  sleep
} from "./utils";

describe("Node method follows spec - proposeInstallVirtual", () => {
  jest.setTimeout(35000);

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
        let abChannelMultisigAddress;
        let bcChannelMultisigAddress;

        nodeB.once(
          NODE_EVENTS.CREATE_CHANNEL,
          async (msg: CreateChannelMessage) => {
            abChannelMultisigAddress = msg.data.multisigAddress;
          }
        );

        nodeA.once(
          NODE_EVENTS.CREATE_CHANNEL,
          async (msg: CreateChannelMessage) => {
            while (!abChannelMultisigAddress) {
              console.log("Waiting for Node A and B to sync on new channel");
              await sleep(500);
            }

            await collateralizeChannel(nodeA, nodeB, msg.data.multisigAddress);

            nodeB.once(
              NODE_EVENTS.CREATE_CHANNEL,
              async (msg: CreateChannelMessage) => {
                bcChannelMultisigAddress = msg.data.multisigAddress;
              }
            );

            nodeC.once(
              NODE_EVENTS.CREATE_CHANNEL,
              async (msg: CreateChannelMessage) => {
                while (!bcChannelMultisigAddress) {
                  console.log(
                    "Waiting for Node B and C to sync on new channel"
                  );
                  await sleep(500);
                }

                await collateralizeChannel(
                  nodeB,
                  nodeC,
                  msg.data.multisigAddress
                );

                const intermediaries = [nodeB.publicIdentifier];
                const installVirtualAppInstanceProposalRequest = makeInstallVirtualProposalRequest(
                  nodeC.publicIdentifier,
                  intermediaries,
                  false,
                  One,
                  Zero
                );

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

                    expect(virtualAppInstanceNodeA).toEqual(
                      virtualAppInstanceNodeC
                    );
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
                      installVirtualAppInstanceProposalRequest.params,
                      proposedAppInstanceA
                    );
                    confirmProposedVirtualAppInstanceOnNode(
                      installVirtualAppInstanceProposalRequest.params,
                      proposedAppInstanceC,
                      true
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
              }
            );
            await getMultisigCreationTransactionHash(nodeB, [
              nodeB.publicIdentifier,
              nodeC.publicIdentifier
            ]);
          }
        );
        await getMultisigCreationTransactionHash(nodeA, [
          nodeA.publicIdentifier,
          nodeB.publicIdentifier
        ]);
      });
    }
  );
});
