import { AppInstanceInfo, Node as NodeTypes } from "@counterfactual/types";
import { v4 as generateUUID } from "uuid";

import { Node, NODE_EVENTS } from "../../src";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import { setup } from "./setup";
import {
  getInstalledAppInstances,
  getMultisigCreationTransactionHash,
  makeInstallProposalRequest
} from "./utils";

describe("Node method follows spec - getAppInstances", () => {
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

  it("can accept a valid call to get empty list of app instances", async () => {
    const appInstances: AppInstanceInfo[] = await getInstalledAppInstances(
      nodeA
    );
    expect(appInstances).toEqual([]);
  });

  it("can accept a valid call to get non-empty list of app instances", async done => {
    nodeA.on(NODE_EVENTS.CREATE_CHANNEL, async () => {
      const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
        nodeB.publicIdentifier
      );

      const installAppInstanceRequestId = generateUUID();
      let installedAppInstance: AppInstanceInfo;

      const getAppInstancesRequestId = generateUUID();
      const getAppInstancesRequest: NodeTypes.MethodRequest = {
        requestId: getAppInstancesRequestId,
        type: NodeTypes.MethodName.GET_APP_INSTANCES,
        params: {} as NodeTypes.GetAppInstancesParams
      };

      nodeA.on(getAppInstancesRequest.type, res => {
        expect(getAppInstancesRequest.type).toEqual(res.type);
        expect(res.requestId).toEqual(getAppInstancesRequestId);

        const getAppInstancesResult: NodeTypes.GetAppInstancesResult =
          res.result;
        expect(getAppInstancesResult.appInstances).toEqual([
          installedAppInstance
        ]);
        done();
      });

      nodeA.on(NodeTypes.MethodName.INSTALL, res => {
        const installResult: NodeTypes.InstallResult = res.result;
        installedAppInstance = installResult.appInstance;
        nodeA.emit(getAppInstancesRequest.type, getAppInstancesRequest);
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
