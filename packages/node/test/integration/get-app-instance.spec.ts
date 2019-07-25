import { NetworkContextForTestSuite } from "@counterfactual/chain/src/contract-deployments.jest";
import { Node as NodeTypes } from "@counterfactual/types";

import { Node } from "../../src";

import { setup, SetupContext } from "./setup";
import {
  Apps,
  confirmAppInstanceInstallation,
  createChannel,
  getInstalledAppInstance,
  installApp,
  makeTTTProposalRequest
} from "./utils";

describe("Node method follows spec - getAppInstanceDetails", () => {
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(async () => {
    const context: SetupContext = await setup(global);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
  });

  it("can accept a valid call to get the desired AppInstance details", async () => {
    await createChannel(nodeA, nodeB);

    const proposedParams = makeTTTProposalRequest(
      nodeB.publicIdentifier,
      (global["networkContext"] as NetworkContextForTestSuite).TicTacToeApp
    ).parameters as NodeTypes.ProposeInstallParams;

    const appInstanceId = await installApp(nodeA, nodeB, Apps.TicTacToe);

    const appInstanceNodeA = await getInstalledAppInstance(
      nodeA,
      appInstanceId
    );

    confirmAppInstanceInstallation(proposedParams, appInstanceNodeA);

    const appInstanceNodeB = await getInstalledAppInstance(
      nodeB,
      appInstanceId
    );

    confirmAppInstanceInstallation(proposedParams, appInstanceNodeB);
  });
});
