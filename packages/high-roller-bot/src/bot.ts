import { Node } from "@counterfactual/node";
import { Node as NodeTypes } from "@counterfactual/types";
import { v4 as generateUUID } from "uuid";
import { HashZero } from "ethers/constants";

export async function afterUser(node: Node) {
  console.log("After User");

  node.on("proposeInstallVirtualEvent", async data => {
    try {
      const appInstanceId = data.data.appInstanceId;
      const intermediaries = data.data.params.intermediaries;
      console.log(
        `Received appInstanceId ${appInstanceId} and intermediaries ${intermediaries}`
      );

      const request = {
        type: NodeTypes.MethodName.INSTALL_VIRTUAL,
        params: {
          appInstanceId,
          intermediaries
        },
        requestId: generateUUID()
      };

      const installedApp = (await node.call(request.type, request)).result;

      console.log("Create event listener for updateState");
      console.log(installedApp);
      node.on(
        NodeTypes.EventName.UPDATE_STATE,
        async (data: NodeTypes.UpdateStateEventData) => {
          console.log(`Received newState ${data}`);
          const newStateArray = data.newState;

          // FIXME: ensure this state is correct
          const state = {
            playerAddrs: newStateArray[0],
            stage: newStateArray[1],
            salt: newStateArray[2],
            commitHash: newStateArray[3],
            playerFirstNumber: newStateArray[4],
            playerSecondNumber: newStateArray[5]
          };

          console.log(`State ${state}`);

          if (state.stage === 2) {
            // Stage.COMMITTING_NUM
            const numToCommit = Math.floor(Math.random() * Math.floor(1000));

            const commitHashAction = {
              number: numToCommit,
              actionType: 2, // ActionType.COMMIT_TO_NUM
              actionHash: HashZero
            };

            console.log("commit hash action");
            console.log(commitHashAction);

            // FIXME: get access to `appInstance` to takeAction
            // this.appInstance.takeAction(commitHashAction);
          }
        }
      );
      // });
    } catch (error) {
      console.log(error);
    }
  });
}
