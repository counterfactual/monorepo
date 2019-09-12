import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { Address, AppInstanceJson } from "@counterfactual/types";
import { One, Zero } from "ethers/constants";
import { BigNumber, bigNumberify } from "ethers/utils";

import { Node } from "../../src";

import { initialSimpleTransferState } from "./simple-transfer";
import {
  getAppInstance,
  getApps,
  installApp,
  installVirtualApp,
  takeAppAction,
  uninstallApp,
  uninstallVirtualApp
} from "./utils";

type UnidirectionalLinkedTransferAppAction = {
  amount: BigNumber;
  assetId: Address;
  paymentId: string;
  preImage: string;
};

type UnidirectionalLinkedTransferAppState = {
  linkedHash: string;
  stage: number; // POST_FUND = 0;
  finalized: boolean;
  turnNum: BigNumber;
  transfers: CoinTransfer[];
};

type CoinTransfer = {
  to: Address;
  amount: BigNumber;
};

/**
 * This file contains any utils functions that are useful when testing
 * Connext specific applications and errors.
 *
 * Note: this does nothing to assert that the transfer exchanges the intended
 * amount. That is assumed to be tested in unit tests.
 */
export async function makeSimpleTransfer(
  sender: Node,
  intermediary: Node,
  receiver: Node,
  amount: BigNumber = One
) {
  // install a virtual transfer app
  const transferDef = (global["networkContext"] as NetworkContextForTestSuite)
    .SimpleTransferApp;

  // create transfer app with default transfer value of 1
  const initialState = initialSimpleTransferState(
    sender.freeBalanceAddress,
    receiver.freeBalanceAddress,
    amount
  );

  const appId = await installVirtualApp(
    sender,
    intermediary,
    receiver,
    transferDef,
    initialState
  );

  const senderApp = await getAppInstance(sender, appId);
  const receiverApp = await getAppInstance(receiver, appId);

  // assert the initial state of the app
  expect(senderApp).toEqual(receiverApp);

  // uninstall the virtual transfer app
  await uninstallVirtualApp(
    sender,
    receiver,
    intermediary.publicIdentifier,
    appId
  );
}

export async function installLink(
  funder: Node,
  redeemer: Node,
  state: UnidirectionalLinkedTransferAppState,
  action: UnidirectionalLinkedTransferAppAction
): Promise<string> {
  const linkDef = (global["networkContext"] as NetworkContextForTestSuite)
    .UnidirectionalLinkedTransferApp;

  const res = await installApp(
    funder,
    redeemer,
    linkDef,
    state,
    bigNumberify(action.amount),
    action.assetId,
    Zero,
    action.assetId
  );
  return res[0]; // appInstanceId
}

function assertLinkRedemption(app: AppInstanceJson, amount: BigNumber): void {
  expect(
    (app.latestState as UnidirectionalLinkedTransferAppState).finalized
  ).toEqual(true);
  expect(
    (app.latestState as UnidirectionalLinkedTransferAppState).transfers[1][1]
  ).toBeEq(amount);
  expect(
    (app.latestState as UnidirectionalLinkedTransferAppState).transfers[0][1]
  ).toBeEq(Zero);
}

/**
 * Takes an action on an already installed link app to redeem the locked value
 * and uninstalls the app
 */
export async function redeemLink(
  redeemer: Node,
  funder: Node,
  appId: string,
  action: UnidirectionalLinkedTransferAppAction
): Promise<string> {
  // take action to finalize state and claim funds from intermediary
  await takeAppAction(redeemer, appId, action);
  const redeemerApp = await getAppInstance(redeemer, appId);
  assertLinkRedemption(redeemerApp, action.amount);
  return await uninstallApp(redeemer, funder, appId);
}

/**
 * Completes the "redeem flow":
 * 1. Matching app with intermediary and link funder found
 * 2. Redeemer and intermediary install a link app
 * 3. Redeemer takes action on the app to claim funds
 * 4. Intermediary takes action on matched app to reclaim funds
 */
export async function installAndRedeemLink(
  funder: Node,
  intermediary: Node,
  redeemer: Node,
  stateAndAction: { action: any; state: any }
) {
  const linkDef = (global["networkContext"] as NetworkContextForTestSuite)
    .UnidirectionalLinkedTransferApp;

  const hubApps = await getApps(intermediary);

  const { state, action } = stateAndAction;

  const hasAddressInTransfers = (
    app: AppInstanceJson,
    addr: string
  ): boolean => {
    return (
      (app.latestState as UnidirectionalLinkedTransferAppState).transfers[0]
        .to === addr ||
      (app.latestState as UnidirectionalLinkedTransferAppState).transfers[1]
        .to === addr
    );
  };

  const getMatchingHubApp = (apps: AppInstanceJson[]) => {
    return apps.find(
      app =>
        hasAddressInTransfers(app, funder.freeBalanceAddress) &&
        app.appInterface.addr === linkDef &&
        (app.latestState as UnidirectionalLinkedTransferAppState).linkedHash ===
          state.linkedHash
    );
  };

  const matchedApp = getMatchingHubApp(hubApps);
  expect(matchedApp).toBeDefined();

  // install an app between the intermediary and redeemer
  const redeemerAppId = await installLink(
    intermediary,
    redeemer,
    state,
    action
  );

  // redeemer take action to finalize state and claim funds from intermediary
  await redeemLink(redeemer, intermediary, redeemerAppId, action);

  // intermediary takes action to finalize state and claim funds from creator
  await redeemLink(intermediary, funder, matchedApp!.identityHash, action);
}
