import { Zero } from "ethers/constants";
import { bigNumberify } from "ethers/utils";

import { Node } from "../../src";
import { toBeEq } from "../engine/integration/bignumber-jest-matcher";

import {
  installAndRedeemLink,
  installLink,
  makeSimpleTransfer
} from "./connext-utils";
import { initialLinkedState } from "./linked-transfer";
import { setup, SetupContext } from "./setup";
import { collateralizeChannel, createChannel } from "./utils";

jest.setTimeout(10_000);

expect.extend({ toBeEq });

///////// Define helper fns
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
  const appIds: string[] = [];
  for (const { state, action } of statesAndActions) {
    appIds.push(await installLink(funder, redeemer, state, action));
  }

  return appIds;
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
      await installAndRedeemLink(
        funder,
        intermediary,
        redeemer,
        statesAndActions.pop()
      );
    }
    done();
  }, 200);
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
    const context: SetupContext = await setup(global, true);
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
   */

  it("should be able to redeem a pregenerated linked payment while simultaneously receiving a direct transfer", async done => {
    // first, pregenerate several linked app initial states
    const {
      linkStatesRedeemer,
      linkStatesSender
    } = generateInitialLinkedTransferStates(nodeA, nodeB, nodeC, 2);

    // try to install a linked app
    await installLinks(nodeA, nodeB, linkStatesSender);

    // begin redeeming apps as the receiver on an interval
    redeemLinkPoller(nodeA, nodeB, nodeC, linkStatesRedeemer, done);

    // while links are redeeming, try to send receiver a
    // direct transfer
    for (const i of Array(2)) {
      await makeSimpleTransfer(nodeA, nodeB, nodeC);
    }
  });
});
