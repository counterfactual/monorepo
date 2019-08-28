import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";
import { Address, AppInstanceJson } from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { BigNumber, bigNumberify, BigNumberish } from "ethers/utils";

import { Node } from "../../src";

import { initialLinkedState } from "./linked-transfer";
import { setup, SetupContext } from "./setup";
import { initialTransferState } from "./unidirectional-transfer";
import {
  collateralizeChannel,
  constructGetAppsRpc,
  constructTakeActionRpc,
  constructUninstallRpc,
  constructUninstallVirtualRpc,
  createChannel,
  installApp,
  installVirtualApp
} from "./utils";
import { prettyPrintObject } from "../../src/utils";

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

/**
 * The connext team has seen some strange issues in production that
 * only appear when multiple bots are running. This test suite will
 * attempt to recreate them in the simplest context.
 */
describe("Can update and install multiple apps simultaneously", () => {
  let nodeA: Node; // sending client
  let nodeB: Node; // node
  let nodeC: Node; // receiving client

  ///////// Define helper fns for nodes

  // creates a number of linked transfer states for redeemers and senders
  function generateInitialLinkedTransferStates(numberApps: number = 3) {
    // TODO: app typings
    const linkStatesSender: { action: any; state: any }[] = [];
    const linkStatesRedeemer: { action: any; state: any }[] = [];
    for (let i = 0; i < numberApps; i += 1) {
      // create new actions and apps for 1 wei of eth
      // note: linked apps will be redeemed twice, once by the actual
      // recipient, and once by the node trying to uninstall the app.
      // the apps will have the same initial state, minus the transfer addresses
      const { action, state } = initialLinkedState(
        nodeA.freeBalanceAddress,
        nodeC.freeBalanceAddress
      );
      linkStatesRedeemer.push({ action, state });
      // update the transfer address for the sender states to be the hubs
      // node
      const hubTransfers = [
        {
          to: nodeA.freeBalanceAddress,
          amount: action.amount
        },
        {
          to: nodeB.freeBalanceAddress,
          amount: 0
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
    const linkDef = (global["networkContext"] as NetworkContextForTestSuite)
      .UnidirectionalLinkedTransferApp;

    const expectedFunderApps = (await getApps(funder)).length + 1;
    const expectedRedeemerApps = (await getApps(redeemer)).length + 1;
    const result: any[] = [];
    for (let i = 0; i < statesAndActions.length; i += 1) {
      const { state, action } = statesAndActions[i];
      result.push(
        await installApp(
          funder,
          redeemer,
          linkDef,
          state,
          bigNumberify(action.amount),
          action.assetId,
          Zero,
          action.assetId
        )
      );
    }
    // sanity check
    const fApps = await getApps(funder);
    const rApps = await getApps(redeemer);
    if (
      fApps.length !== expectedFunderApps ||
      rApps.length !== expectedRedeemerApps
    ) {
      throw new Error(
        `Installed app length between two parties mismatch. redeemer apps: ${rApps.length}, funder apps: ${fApps.length}`
      );
    }
    console.log(`successfully installed ${result.length} link apps`);
    return result;
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

    // NOTE: this may return more than one valid app, thats fine, just take
    // the first.
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
        hasAddressInTransfers(a, funder.freeBalanceAddress)
    )[0];
    if (!matchedApp) {
      throw new Error(
        `Could not find installed app with intermediary with desired properties`
      );
    }

    console.log(
      "******** found matching app in hubs channel with id",
      matchedApp.identityHash
    );

    // install app between the redeemer and the intermediary
    const [redeemerAppId] = (await installLinks(intermediary, redeemer, [
      stateAndAction
    ]))[0];
    console.log("***** redeemer app installed with id:", redeemerAppId);

    // take action to finalize state and claim funds from intermediary
    await takeAppAction(redeemer, redeemerAppId, stateAndAction.action);

    console.log(
      "********** redeemer apps after action",
      prettyPrintObject(await getApps(redeemer))
    );

    // uninstall the app between the redeemer and the intermediary
    await uninstallApp(redeemer, redeemerAppId);

    console.log(
      "********** redeemer apps after uninstall",
      prettyPrintObject(await getApps(redeemer))
    );

    // take action with funder and intermediary to finalize
    // NOTE: this should already be installed
    await takeAppAction(
      intermediary,
      matchedApp.identityHash,
      stateAndAction.action
    );

    // uninstall the app between the funder and intermediary to break even
    await uninstallApp(intermediary, matchedApp.identityHash);
  }

  /*
  // calls `redeemLink` every half second on a poller
  function redeemLinkPoller(
    funder: Node,
    intermediary: Node,
    redeemer: Node,
    statesAndActions: any[],
    done: any
  ) {
    console.log("******* poller started");
    setTimeout(async () => {
      if (statesAndActions.length > 0) {
        console.log(
          "******* trying to redeem link",
          statesAndActions.length,
          "remaining"
        );
        await redeemLink(
          funder,
          intermediary,
          redeemer,
          statesAndActions.pop()
        );
      } else {
        done();
      }
    }, 100);
  }
  */

  // installs, updates, and uninstalls a virtual eth unidirectional
  // transfer app
  async function makeTransfer(
    sender: Node,
    intermediary: Node,
    receiver: Node
  ) {
    console.log("******* trying to transfer as virtual app");
    // install a virtual transfer app
    const transferDef = (global["networkContext"] as NetworkContextForTestSuite)
      .UnidirectionalTransferApp;

    // create transfer app with default transfer value of 1
    const initialState = initialTransferState(
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

    console.log("******* transfer app installed");

    // take action on the virtual transfer app to send money
    await takeAppAction(sender, appId, {
      actionType: ActionType.SEND_MONEY,
      amount: 1
    });

    console.log("******* transfer app updated");

    // take action on virtual transfer app to finalize state
    await takeAppAction(sender, appId, {
      actionType: ActionType.END_CHANNEL,
      amount: 0
    });

    console.log("******* transfer app finalized");

    // uninstall the virtual transfer app
    await uninstallVirtualApp(sender, intermediary.publicIdentifier, appId);

    console.log("******* transfer app uninstalled");
  }

  beforeAll(async () => {
    const context: SetupContext = await setup(global, true, true);
    nodeA = context["A"].node;
    nodeB = context["B"].node;
    nodeC = context["C"].node;
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
  it("should be able to redeem a pregenerated linked payment while simultaneously receiving a direct transer", async done => {
    const multisigAddressAB = await createChannel(nodeA, nodeB);
    const multisigAddressBC = await createChannel(nodeB, nodeC);

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

    // first, pregenerate several linked app initial states
    const {
      linkStatesRedeemer,
      linkStatesSender
    } = generateInitialLinkedTransferStates(1);

    // install all the linked apps on the sender side
    await installLinks(nodeA, nodeB, linkStatesSender);

    // try to redeem links
    await redeemLink(nodeA, nodeB, nodeC, linkStatesRedeemer.pop());

    done();

    // // begin redeeming apps as the receiver on an interval
    // redeemLinkPoller(nodeA, nodeB, nodeC, linkStatesRedeemer, done);

    // while links are redeeming, try to send receiver a
    // direct transfer
    await makeTransfer(nodeA, nodeB, nodeC);
  });
});
