import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";
import { Address, AppInstanceJson } from "@counterfactual/types";
import { One, Zero } from "ethers/constants";
import { BigNumber, bigNumberify, BigNumberish } from "ethers/utils";

import { InstallMessage, Node, NODE_EVENTS } from "../../src";
import { prettyPrintObject } from "../../src/utils";
import { toBeEq } from "../machine/integration/bignumber-jest-matcher";

import { initialLinkedState } from "./linked-transfer";
import { setup, SetupContext } from "./setup";
import { initialSimpleTransferState } from "./simple-transfer";
import {
  collateralizeChannel,
  constructGetAppsRpc,
  constructTakeActionRpc,
  constructUninstallRpc,
  constructUninstallVirtualRpc,
  createChannel,
  getAppInstance,
  installApp,
  installVirtualApp
} from "./utils";

expect.extend({ toBeEq });

type UnidirectionalLinkedTransferAppAction = {
  amount: BigNumber;
  assetId: Address;
  paymentId: string;
  preImage: string;
};

enum ActionType {
  SEND_MONEY,
  END_CHANNEL
}

type UnidirectionalTransferAppAction = {
  actionType: ActionType;
  amount: BigNumberish;
};

///////// Define helper fns for nodes

// creates a number of linked transfer states for redeemers and senders
function generateInitialLinkedTransferStates(
  sender: Node,
  intermediary: Node,
  redeemer: Node,
  numberApps: number = 3
) {
  // TODO: app typings
  const linkStatesSender: { action: any; state: any }[] = [];
  const linkStatesRedeemer: { action: any; state: any }[] = [];
  for (let i = 0; i < numberApps; i += 1) {
    // create new actions and apps for 1 wei of eth
    // note: linked apps will be redeemed twice, once by the actual
    // recipient, and once by the node trying to uninstall the app.
    // the apps will have the same initial state, minus the transfer addresses
    const { action, state } = initialLinkedState(
      intermediary.freeBalanceAddress,
      redeemer.freeBalanceAddress
    );
    linkStatesRedeemer.push({ action, state });
    // update the transfer address for the sender states to be the hubs
    // node
    const hubTransfers = [
      {
        to: sender.freeBalanceAddress,
        amount: action.amount
      },
      {
        to: intermediary.freeBalanceAddress,
        amount: Zero
      }
    ];
    // sender has initial state installed with hub
    linkStatesSender.push({
      action,
      state: { ...state, transfers: hubTransfers }
    });
  }
  return {
    linkStatesRedeemer,
    linkStatesSender
  };
}

// installs an array of linked transfer apps between a
// "funder" node and a "redeemer" node
// TODO: fix typings
async function installLinks(
  funder: Node,
  redeemer: Node,
  statesAndActions: any[]
) {
  const appIds: string[] = await new Promise(async resolve => {
    const linkDef = (global["networkContext"] as NetworkContextForTestSuite)
      .UnidirectionalLinkedTransferApp;

    const appIds: string[] = [];
    funder.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
      const id = msg.data.params.appInstanceId;
      const redeemerApp = await getAppInstance(redeemer, id);
      const funderApp = await getAppInstance(funder, id);
      expect(redeemerApp).toEqual(funderApp);
      appIds.push(id);
      if (appIds.length === statesAndActions.length) {
        resolve(appIds);
      }
    });

    statesAndActions.forEach(async ({ state, action }) => {
      await installApp(
        funder,
        redeemer,
        linkDef,
        state,
        bigNumberify(action.amount),
        action.assetId,
        Zero,
        action.assetId
      );
    });
  });
  console.log(
    `successfully installed ${
      appIds.length
    } link apps with ids ${prettyPrintObject(appIds)}`
  );
  return appIds;
}

async function takeAppAction(
  node: Node,
  appId: string,
  action:
    | UnidirectionalLinkedTransferAppAction
    | UnidirectionalTransferAppAction
) {
  const res = await node.rpcRouter.dispatch(
    constructTakeActionRpc(appId, action)
  );
  return res.result.result;
}

async function uninstallApp(node: Node, appId: string) {
  return (await node.rpcRouter.dispatch(constructUninstallRpc(appId))).result
    .result;
}

async function uninstallVirtualApp(
  node: Node,
  intermediaryPubId: string,
  appId: string
) {
  const rpc = constructUninstallVirtualRpc(appId, intermediaryPubId);
  return (await node.rpcRouter.dispatch(rpc)).result.result;
}

async function getApps(node: Node): Promise<AppInstanceJson[]> {
  return (await node.rpcRouter.dispatch(constructGetAppsRpc())).result.result
    .appInstances;
}

const assertLinkRedemption = (app: AppInstanceJson) => {
  expect((app.latestState as any).finalized).toEqual(true);
  expect((app.latestState as any).transfers[1][1]).toBeEq(One);
  expect((app.latestState as any).transfers[0][1]).toBeEq(Zero);
};

// will uninstall an app between the intermediary and the funder
// after the redeemer installs an app and reveals a secret between
// the redeemer and the intermediary
async function redeemLink(
  funder: Node,
  intermediary: Node,
  redeemer: Node,
  stateAndAction: any
) {
  const linkDef = (global["networkContext"] as NetworkContextForTestSuite)
    .UnidirectionalLinkedTransferApp;
  const hubApps = await getApps(intermediary);

  const hasAddressInTransfers = (
    app: AppInstanceJson,
    addr: string
  ): boolean => {
    return (
      (app.latestState as any).transfers[0].to === addr ||
      (app.latestState as any).transfers[1].to === addr
    );
  };
  const matchedApp = hubApps.filter(
    a =>
      a.appInterface.addr === linkDef &&
      hasAddressInTransfers(a, funder.freeBalanceAddress) &&
      (a.latestState as any).linkedHash === stateAndAction.state.linkedHash
  )[0];
  if (!matchedApp) {
    throw new Error(
      `Could not find installed app with intermediary with desired properties`
    );
  }

  // install app between the redeemer and the intermediary
  const redeemerAppId = (await installLinks(intermediary, redeemer, [
    stateAndAction
  ]))[0];

  // take action to finalize state and claim funds from intermediary
  await takeAppAction(redeemer, redeemerAppId, stateAndAction.action);

  const redeemerApp = await getAppInstance(redeemer, redeemerAppId);
  assertLinkRedemption(redeemerApp);
  console.log("**** successfully redeemed by redeemer");

  // uninstall the app between the redeemer and the intermediary
  await uninstallApp(redeemer, redeemerAppId);
  console.log("**** successfully uninstalled by redeemer");

  // take action with funder and intermediary to finalize
  // NOTE: this should already be installed
  await takeAppAction(
    intermediary,
    matchedApp.identityHash,
    stateAndAction.action
  );
  const intermediaryApp = await getAppInstance(
    intermediary,
    matchedApp.identityHash
  );
  assertLinkRedemption(intermediaryApp);
  console.log("**** successfully redeemed by intermediary");

  // uninstall the app between the funder and intermediary to break even
  await uninstallApp(intermediary, matchedApp.identityHash);
  console.log("**** successfully uninstalled by intermediary");
}

// calls `redeemLink` every half second on a poller
function redeemLinkPoller(
  funder: Node,
  intermediary: Node,
  redeemer: Node,
  statesAndActions: any[],
  done: any
) {
  setTimeout(async () => {
    while (statesAndActions.length > 0) {
      console.log(
        `******* trying to redeem link. ${statesAndActions.length} remaining`
      );
      await redeemLink(funder, intermediary, redeemer, statesAndActions.pop());
    }
    done();
  }, 1000);
}

async function getAppType(
  node: Node,
  appId: string,
  type:
    | "SimpleTransferApp"
    | "UnidirectionalTransferApp"
    | "UnidirectionalLinkedTransferApp"
) {
  const appDef = (global["networkContext"] as NetworkContextForTestSuite)[type];
  return (await getApps(node)).filter(
    app => app.appInterface.addr === appDef && app.identityHash === appId
  )[0];
}

async function makeSimpleTransfer(
  sender: Node,
  intermediary: Node,
  receiver: Node
) {
  console.log("******* trying to simple transfer as virtual app");
  // install a virtual transfer app
  const transferDef = (global["networkContext"] as NetworkContextForTestSuite)
    .SimpleTransferApp;

  // create transfer app with default transfer value of 1
  const initialState = initialSimpleTransferState(
    sender.freeBalanceAddress,
    receiver.freeBalanceAddress
  );

  const appId = await installVirtualApp(
    sender,
    intermediary,
    receiver,
    transferDef,
    initialState
  );

  let senderTransferApp = await getAppType(sender, appId, "SimpleTransferApp");
  let receiverTransferApp = await getAppType(
    receiver,
    appId,
    "SimpleTransferApp"
  );
  expect(senderTransferApp).toEqual(receiverTransferApp);
  expect((senderTransferApp.latestState as any).coinTransfers[0].amount).toBeEq(
    One
  );
  expect((senderTransferApp.latestState as any).coinTransfers[1].amount).toBeEq(
    Zero
  );
  console.log("******* installed simple transfer");

  // uninstall the virtual transfer app
  await uninstallVirtualApp(sender, intermediary.publicIdentifier, appId);
  senderTransferApp = await getAppType(sender, appId, "SimpleTransferApp");
  receiverTransferApp = await getAppType(receiver, appId, "SimpleTransferApp");
  // TODO: find race condition to get rid of polling
  while (receiverTransferApp) {
    console.log("still found receiver app, retrying...");
    await new Promise(resolve => setTimeout(resolve, 1000));
    receiverTransferApp = await getAppType(
      receiver,
      appId,
      "SimpleTransferApp"
    );
  }
  expect(receiverTransferApp).toBeUndefined();
  expect(senderTransferApp).toBeUndefined();

  console.log("******* uninstalled simple transfer");

  // TODO: check balance transferred
}

/**
 * The connext team has seen some strange issues in production that
 * only appear when multiple bots are running. This test suite will
 * attempt to recreate them in the simplest context.
 */
describe("Can update and install multiple apps simultaneously", () => {
  let nodeA: Node; // sending client
  let nodeB: Node; // node
  let nodeC: Node; // receiving client

  let multisigAddressAB: string;
  let multisigAddressBC: string;

  beforeEach(async () => {
    const context: SetupContext = await setup(global, true, true);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    nodeC = context["C"].node;

    multisigAddressAB = await createChannel(nodeA, nodeB);
    multisigAddressBC = await createChannel(nodeB, nodeC);

    // this deposits into both nodes. realistically, we want
    // to have nodeA deposit into AB, and nodeB collateralize
    // BC
    await collateralizeChannel(
      multisigAddressAB,
      nodeA,
      undefined, // choose not to fund nodeB
      bigNumberify(15)
    );
    await collateralizeChannel(
      multisigAddressBC,
      nodeB,
      undefined, // choose not to fund nodeC
      bigNumberify(15)
    );
  });

  /**
   * In production, this flow has resulted in several varying bugs including:
   * - IO send and wait timed out
   * - Validating a signature with expected signer 0xFFF but recovered 0xAAA
   * - cannot find agreement with target hash 0xCCC
   * - hanging on client or node
   *
   * These errors were successfully reproduced by connext in the `test-bot-farm`
   * script, both with the postgres store and the memory store.
   */
  it("should be able to redeem a pregenerated linked payment while simultaneously receiving a direct transfer", async done => {
    // first, pregenerate several linked app initial states
    const {
      linkStatesRedeemer,
      linkStatesSender
    } = generateInitialLinkedTransferStates(nodeA, nodeB, nodeC, 1);

    // try to install a linked app
    await installLinks(nodeA, nodeB, linkStatesSender);

    // sanity check that all installed apps have expected hashes
    const linkDef = (global["networkContext"] as NetworkContextForTestSuite)
      .UnidirectionalLinkedTransferApp;

    const verifyLinkedHashes = async (node: Node, states: any[]) => {
      const hashes = (await getApps(node)).map(app => {
        if (app.appInterface.addr === linkDef) {
          return (app.latestState as any).linkedHash;
        }
      });
      hashes.forEach((hash, i) => {
        expect(hash).toEqual(states[i].state.linkedHash);
      });
    };

    await verifyLinkedHashes(nodeB, linkStatesRedeemer);
    await verifyLinkedHashes(nodeA, linkStatesSender);

    // begin redeeming apps as the receiver on an interval
    redeemLinkPoller(nodeA, nodeB, nodeC, linkStatesRedeemer, done);

    // while links are redeeming, try to send receiver a
    // direct transfer
    await makeSimpleTransfer(nodeA, nodeB, nodeC);
  });
});
