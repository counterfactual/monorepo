import {
  Node,
  ProposeVirtualMessage,
  UninstallVirtualMessage,
  UpdateStateMessage
} from "@counterfactual/node";
import { Address, Node as NodeTypes } from "@counterfactual/types";
import { solidityKeccak256 } from "ethers/utils";
import { v4 as generateUUID } from "uuid";

import { getFreeBalance, renderFreeBalanceInEth } from "./utils";

/// Returns the commit hash that can be used to commit to chosenNumber
/// using appSalt
function computeCommitHash(appSalt: string, chosenNumber: number) {
  return solidityKeccak256(["bytes32", "uint256"], [appSalt, chosenNumber]);
}

function respond(node: Node, nodeAddress: Address, msg: UpdateStateMessage) {
  const data: NodeTypes.UpdateStateEventData = msg.data;
  const { appInstanceId, newState } = data;

  // FIXME: introduce better logging
  if (process.env.LOG_LEVEL && process.env.LOG_LEVEL === "DEBUG") {
    console.log("new state");
    console.log(newState);
  }

  if (newState.stage === 2) {
    // Stage.COMMITTING_NUM
    const numToCommit = Math.floor(Math.random() * Math.floor(1000));

    const numberSalt =
      "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
    const playerFirstNumber = Math.floor(Math.random() * Math.floor(1000));
    const hash = computeCommitHash(numberSalt, playerFirstNumber);

    const commitHashAction = {
      number: numToCommit,
      actionType: 2, // ActionType.COMMIT_TO_NUM
      actionHash: hash
    };

    const request = {
      params: {
        appInstanceId,
        action: commitHashAction
      } as NodeTypes.TakeActionParams,
      requestId: generateUUID(),
      type: NodeTypes.MethodName.TAKE_ACTION
    };
    node.call(request.type, request);
  }
}

export async function connectNode(
  botName: string,
  node: Node,
  botPublicIdentifier: string,
  multisigAddress?: string
) {
  node.on(
    NodeTypes.EventName.PROPOSE_INSTALL_VIRTUAL,
    async (msg: ProposeVirtualMessage) => {
      const appInstanceId = msg.data.appInstanceId;
      const intermediaries = msg.data.params.intermediaries;

      const request = {
        type: NodeTypes.MethodName.INSTALL_VIRTUAL,
        params: {
          appInstanceId,
          intermediaries
        },
        requestId: generateUUID()
      };

      try {
        await node.call(request.type, request);
        node.on(
          NodeTypes.EventName.UPDATE_STATE,
          async (updateEventData: UpdateStateMessage) => {
            if (updateEventData.data.appInstanceId === appInstanceId) {
              respond(node, botPublicIdentifier, updateEventData);
            }
          }
        );
      } catch (e) {
        console.error(
          `Node call to install virtual app failed. Request: ${request}. Error: ${e}.`
        );
      }
    }
  );

  if (multisigAddress) {
    node.on(
      NodeTypes.EventName.UNINSTALL_VIRTUAL,
      async (uninstallMsg: UninstallVirtualMessage) => {
        console.info(`Uninstalled app`);
        console.info(uninstallMsg);
        renderFreeBalanceInEth(await getFreeBalance(node, multisigAddress));
      }
    );
  }
  console.info(`Bot ${botName} is ready to serve`);
}
