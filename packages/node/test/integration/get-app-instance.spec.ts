import { AppInstanceInfo, Node as NodeTypes } from "@counterfactual/types";
import { v4 as generateUUID } from "uuid";

import { Node, NODE_EVENTS } from "../../src";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  getMultisigCreationTransactionHash,
  makeInstallProposalRequest
} from "./utils";

describe("Node method follows spec - getAppInstanceDetails", () => {
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

  it("can accept a valid call to get the desired AppInstance details", async done => {
    nodeA.on(NODE_EVENTS.CREATE_CHANNEL, async () => {
      const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
        nodeB.publicIdentifier
      );

      const installAppInstanceRequestId = generateUUID();
      let installedAppInstance: AppInstanceInfo;

      nodeA.on(NodeTypes.MethodName.INSTALL, async res => {
        const installResult: NodeTypes.InstallResult = res.result;

        installedAppInstance = installResult.appInstance;

        const getAppInstancesRequest: NodeTypes.MethodRequest = {
          requestId: generateUUID(),
          type: NodeTypes.MethodName.GET_APP_INSTANCE_DETAILS,
          params: {
            appInstanceId: installedAppInstance.id
          } as NodeTypes.GetAppInstanceDetailsParams
        };

        const response: NodeTypes.MethodResponse = await nodeA.call(
          getAppInstancesRequest.type,
          getAppInstancesRequest
        );
        const appInstanceInfo = (response.result as NodeTypes.GetAppInstanceDetailsResult)
          .appInstance;

        expect(installedAppInstance).toEqual(appInstanceInfo);
        done();
      });

      nodeA.on(appInstanceInstallationProposalRequest.type, res => {
        const installProposalResult: NodeTypes.ProposeInstallResult =
          res.result;
        const appInstanceId = installProposalResult.appInstanceId;
        const installAppInstanceRequest: NodeTypes.MethodRequest = {
          requestId: installAppInstanceRequestId,
          type: NodeTypes.MethodName.INSTALL,
          params: {
            appInstanceId
          } as NodeTypes.InstallParams
        };

        nodeA.emit(installAppInstanceRequest.type, installAppInstanceRequest);
      });

      nodeA.emit(
        appInstanceInstallationProposalRequest.type,
        appInstanceInstallationProposalRequest
      );
    });
    await getMultisigCreationTransactionHash(nodeA, [
      nodeA.publicIdentifier,
      nodeB.publicIdentifier
    ]);
  });
});
