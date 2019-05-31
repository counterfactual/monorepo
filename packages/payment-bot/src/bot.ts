import { Node, UninstallVirtualMessage } from "@counterfactual/node";
import { Address, Node as NodeTypes } from "@counterfactual/types";
import { utils } from "ethers";
import { Zero } from "ethers/constants";
import { fromExtendedKey } from "ethers/utils/hdnode";
// tslint:disable-next-line
import EventEmitter from "events";
import inquirer from "inquirer";
import { v4 as generateUUID } from "uuid";

import { getBot } from ".";
import { getFreeBalance, logEthFreeBalance } from "./utils";

class MyEmitter extends EventEmitter {}

const myEmitter = new MyEmitter();

function respond(
  node: Node,
  nodeAddress: Address,
  { data: { appInstanceId, newState } }
) {
  console.log("appInstanceId, newState: ", appInstanceId, newState);
}

export async function connectNode(
  botName: string,
  node: Node,
  botPublicIdentifier: string,
  multisigAddress?: string
) {
  node.on(NodeTypes.EventName.PROPOSE_INSTALL_VIRTUAL, async data => {
    const appInstanceId = data.data.appInstanceId;
    const intermediaries = data.data.params.intermediaries;

    const request = {
      type: NodeTypes.MethodName.INSTALL_VIRTUAL,
      params: {
        appInstanceId,
        intermediaries
      },
      requestId: generateUUID()
    };

    try {
      const result = await node.call(request.type, request);
      myEmitter.emit("installVirtualApp", node, result);
      node.on(NodeTypes.EventName.UPDATE_STATE, async updateEventData => {
        if (updateEventData.data.appInstanceId === appInstanceId) {
          respond(node, botPublicIdentifier, updateEventData);
        }
      });
    } catch (e) {
      console.error("Node call to install virtual app failed.");
      console.error(request);
      console.error(e);
    }
  });

  node.on(NodeTypes.EventName.INSTALL_VIRTUAL, async installVirtualData => {
    console.log("installVirtualData: ", installVirtualData);
    myEmitter.emit("installVirtualApp", node, installVirtualData);
  });

  node.on(NodeTypes.EventName.UPDATE_STATE, async updateStateData => {
    myEmitter.emit("updateState", node, updateStateData);
  });

  if (multisigAddress) {
    node.on(
      NodeTypes.EventName.UNINSTALL_VIRTUAL,
      async (uninstallMsg: UninstallVirtualMessage) => {
        console.info(`Uninstalled app`);
        console.info(uninstallMsg);
        myEmitter.emit("uninstallVirtualApp", node, multisigAddress);
      }
    );
  }
  console.info(`Bot ${botName} is ready to serve`);
}

export async function showMainPrompt(node: Node) {
  const { result } = (await node.call(NodeTypes.MethodName.GET_APP_INSTANCES, {
    type: NodeTypes.MethodName.GET_APP_INSTANCES,
    params: {} as NodeTypes.GetAppInstancesParams,
    requestId: generateUUID()
  })) as Record<string, NodeTypes.GetAppInstancesResult>;

  if (result.appInstances.length > 0) {
    showAppInstancesPrompt(node);
  } else {
    showDirectionPrompt(node);
  }
}

export async function showAppInstancesPrompt(node: Node) {
  const { result } = (await node.call(NodeTypes.MethodName.GET_APP_INSTANCES, {
    type: NodeTypes.MethodName.GET_APP_INSTANCES,
    params: {} as NodeTypes.GetAppInstancesParams,
    requestId: generateUUID()
  })) as Record<string, NodeTypes.GetAppInstancesResult>;

  if (result.appInstances.length === 0) {
    return;
  }

  inquirer
    .prompt({
      type: "list",
      name: "viewApp",
      message: "Select a payment thread to view options",
      choices: result.appInstances.map(app => app.id)
    })
    .then(async answers => {
      const { viewApp } = answers as Record<string, string>;
      await showAppOptions(node, viewApp);
    });
}

function logThreadBalances(balances) {
  console.log(
    `Balances: Alice - ${utils.formatEther(
      balances.aliceBalance
    )}, Bob - ${utils.formatEther(balances.bobBalance)}`
  );
}

async function showAppOptions(node: Node, appId: string) {
  const { result: getAppInstancesResult } = (await node.call(
    NodeTypes.MethodName.GET_APP_INSTANCE_DETAILS,
    {
      type: NodeTypes.MethodName.GET_APP_INSTANCES,
      params: {
        appInstanceId: appId
      } as NodeTypes.GetAppInstanceDetailsParams,
      requestId: generateUUID()
    }
  )) as Record<string, NodeTypes.GetAppInstanceDetailsResult>;
  const choices = ["balances", "uninstall"];
  if (
    (getAppInstancesResult.appInstance as any).initialState.alice ===
    fromExtendedKey(node.publicIdentifier).derivePath("0").address
  ) {
    choices.unshift("send");
  }

  const { result: getStateResult } = (await node.call(
    NodeTypes.MethodName.GET_STATE,
    {
      type: NodeTypes.MethodName.GET_STATE,
      params: {
        appInstanceId: appId
      } as NodeTypes.GetStateParams,
      requestId: generateUUID()
    }
  )) as Record<string, NodeTypes.GetStateResult>;

  inquirer
    .prompt({
      choices,
      type: "list",
      name: "viewOptions",
      message: "Select an action to take"
    })
    .then(async answers => {
      const { viewOptions } = answers as Record<string, string>;
      if (viewOptions === "balances") {
        logThreadBalances(getStateResult.state);
        showAppOptions(node, appId);
      } else if (viewOptions === "send") {
        logThreadBalances(getStateResult.state);
        showSendPrompt(node, appId);
      } else if (viewOptions === "uninstall") {
        await uninstallVirtualApp(node, appId);
      }
    });
}

function showSendPrompt(node: Node, appId: string) {
  inquirer
    .prompt({
      type: "input",
      name: "sendInVirtualApp",
      message: "Amount to send"
    })
    .then(async answers => {
      const { sendInVirtualApp } = answers as Record<string, string>;
      const request: NodeTypes.MethodRequest = {
        type: NodeTypes.MethodName.TAKE_ACTION,
        requestId: generateUUID(),
        params: {
          appInstanceId: appId,
          action: {
            paymentAmount: utils.parseEther(sendInVirtualApp).toString()
          }
        } as NodeTypes.TakeActionParams
      };

      await node.call(request.type, request);
    });
}

export function showDirectionPrompt(node: Node) {
  inquirer
    .prompt([
      {
        type: "list",
        name: "direction",
        message: "Are you sending or receiving payments?",
        choices: ["sending", "receiving"]
      }
    ])
    .then(answers => {
      if ((answers as Record<string, string>).direction === "sending") {
        showOpenVirtualChannelPrompt(node);
      } else {
        const bot = getBot();
        console.log(`Bot\n`, bot);
        console.log("Waiting to receive virtual install request...");
      }
    });
}

export function showOpenVirtualChannelPrompt(node: Node) {
  inquirer
    .prompt([
      {
        type: "input",
        message: "Enter counterparty public identifier:",
        name: "counterpartyPublicId"
      },
      {
        type: "input",
        message: "Enter Party A deposit amount:",
        name: "depositPartyA"
      }
    ])
    .then(async answers => {
      const { counterpartyPublicId, depositPartyA } = answers as Record<
        string,
        string
      >;
      await openVirtualChannel(node, depositPartyA, counterpartyPublicId);
    });
}

async function openVirtualChannel(
  node: Node,
  depositPartyA: string,
  counterpartyPublicId: string
) {
  const request: NodeTypes.MethodRequest = {
    type: NodeTypes.MethodName.PROPOSE_INSTALL_VIRTUAL,
    params: {
      appId: "0xcEF2a3168f9c540141a9C1e68ec907186C4950AB", // TODO: get this from somewhere else?
      abiEncodings: {
        stateEncoding:
          "tuple(address alice, address bob, uint256 aliceBalance, uint256 bobBalance)",
        actionEncoding: "tuple(uint256 paymentAmount)"
      },
      asset: { assetType: 0 },
      myDeposit: utils.parseEther(depositPartyA),
      peerDeposit: Zero,
      timeout: Zero,
      initialState: {
        alice: fromExtendedKey(node.publicIdentifier).derivePath("0").address,
        bob: fromExtendedKey(counterpartyPublicId).derivePath("0").address,
        aliceBalance: utils.parseEther(depositPartyA).toString(),
        bobBalance: "0"
      },
      intermediaries: [process.env.INTERMEDIARY_IDENTIFIER],
      proposedToIdentifier: counterpartyPublicId
    } as NodeTypes.ProposeInstallVirtualParams,
    requestId: generateUUID()
  };
  const result = await node.call(request.type, request);
  myEmitter.emit("proposeInstallVirtualApp", node, result);
}

async function uninstallVirtualApp(node: Node, appInstanceId: string) {
  await node.call(NodeTypes.MethodName.UNINSTALL_VIRTUAL, {
    type: NodeTypes.MethodName.UNINSTALL_VIRTUAL,
    requestId: generateUUID(),
    params: {
      appInstanceId,
      intermediaryIdentifier: process.env.INTERMEDIARY_IDENTIFIER
    } as NodeTypes.UninstallVirtualParams
  });
  myEmitter.emit("uninstallVirtualApp", node);
}

myEmitter.on(
  "uninstallVirtualApp",
  async (node: Node, multisigAddress: string) => {
    logEthFreeBalance(await getFreeBalance(node, multisigAddress));
    showMainPrompt(node);
  }
);

myEmitter.on(
  "proposeInstallVirtualApp",
  async (node: Node, result: NodeTypes.MethodResponse) => {
    console.log(
      "Propose virtual app install\n",
      JSON.stringify(result, null, 2)
    );
    await showAppInstancesPrompt(node);
  }
);

myEmitter.on(
  "installVirtualApp",
  async (node: Node, result: NodeTypes.MethodResponse) => {
    console.info(`Installed virtual app: `, JSON.stringify(result, null, 2));
    await showAppInstancesPrompt(node);
  }
);

myEmitter.on(
  "updateState",
  async (node: Node, result: NodeTypes.MethodResponse) => {
    logThreadBalances((result as any).data.newState);
    await showAppInstancesPrompt(node);
  }
);
