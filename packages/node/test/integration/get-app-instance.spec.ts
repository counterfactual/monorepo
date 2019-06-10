// @ts-ignore - firebase-server depends on node being transpiled first, circular dependency
import { LocalFirebaseServiceFactory } from "@counterfactual/store-firebase-server";
import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";

import { setup } from "./setup";
import {
  confirmAppInstanceInstallation,
  createChannel,
  getInstalledAppInstanceInfo,
  installTTTApp,
  makeTTTProposalRequest
} from "./utils";

describe("Node method follows spec - getAppInstanceDetails", () => {
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const result = await setup(global);
    nodeA = result.nodeA;
    nodeB = result.nodeB;
  });

  it("can accept a valid call to get the desired AppInstance details", async () => {
    await createChannel(nodeA, nodeB);

    const proposedParams = makeTTTProposalRequest(
      nodeA.publicIdentifier,
      nodeB.publicIdentifier,
      global["networkContext"].TicTacToe
    ).params as NodeTypes.ProposeInstallParams;

    const appInstanceId = await installTTTApp(nodeA, nodeB);
    const appInstanceNodeA = await getInstalledAppInstanceInfo(
      nodeA,
      appInstanceId
    );
    confirmAppInstanceInstallation(proposedParams, appInstanceNodeA);

    const appInstanceNodeB = await getInstalledAppInstanceInfo(
      nodeB,
      appInstanceId
    );
    confirmAppInstanceInstallation(proposedParams, appInstanceNodeB);
  });
});
