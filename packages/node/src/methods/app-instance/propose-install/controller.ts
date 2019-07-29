import { Node } from "@counterfactual/types";
import { BigNumber } from "ethers/utils";
import Queue from "p-queue";
import { jsonRpcMethod } from "rpc-server";

import { xkeyKthAddress } from "../../../machine";
import { StateChannel } from "../../../models";
import {
  CONVENTION_FOR_ETH_TOKEN_ADDRESS,
  getBalancesFromFreeBalanceAppInstance
} from "../../../models/free-balance";
import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, ProposeMessage } from "../../../types";
import { hashOfOrderedPublicIdentifiers } from "../../../utils";
import { NodeController } from "../../controller";
import {
  INSUFFICIENT_FUNDS_IN_FREE_BALANCE_FOR_ASSET,
  NO_CHANNEL_BETWEEN_NODES,
  NULL_INITIAL_STATE_FOR_PROPOSAL
} from "../../errors";

import { createProposedAppInstance } from "./operation";

/**
 * This creates an entry of a proposed AppInstance while sending the proposal
 * to the peer with whom this AppInstance is specified to be installed.
 *
 * @returns The AppInstanceId for the proposed AppInstance
 */
export default class ProposeInstallController extends NodeController {
  public static readonly methodName = Node.MethodName.PROPOSE_INSTALL;

  @jsonRpcMethod("chan_proposeInstall")
  public executeMethod = super.executeMethod;

  protected async enqueueByShard(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallParams
  ): Promise<Queue[]> {
    const { store, publicIdentifier } = requestHandler;
    const { initialState } = params;

    if (!initialState) {
      throw new Error(NULL_INITIAL_STATE_FOR_PROPOSAL);
    }

    const {
      proposedToIdentifier,
      initiatorDeposit,
      responderDeposit,
      initiatorDepositTokenAddress: initiatorDepositTokenAddressParam,
      responderDepositTokenAddress: responderDepositTokenAddressParam
    } = params;

    const myIdentifier = publicIdentifier;

    const multisigAddress = await store.getMultisigAddressFromOwnersHash(
      hashOfOrderedPublicIdentifiers([myIdentifier, proposedToIdentifier])
    );

    // TODO: DRY this at top level of most calls that query a channel
    if (!multisigAddress) {
      throw new Error(
        NO_CHANNEL_BETWEEN_NODES(myIdentifier, proposedToIdentifier)
      );
    }

    const initiatorDepositTokenAddress =
      initiatorDepositTokenAddressParam || CONVENTION_FOR_ETH_TOKEN_ADDRESS;

    const responderDepositTokenAddress =
      responderDepositTokenAddressParam || CONVENTION_FOR_ETH_TOKEN_ADDRESS;

    const stateChannel = await store.getStateChannel(multisigAddress);

    assertSufficientFundsWithinFreeBalance(
      stateChannel,
      myIdentifier,
      initiatorDepositTokenAddress,
      initiatorDeposit
    );

    assertSufficientFundsWithinFreeBalance(
      stateChannel,
      proposedToIdentifier,
      responderDepositTokenAddress,
      responderDeposit
    );

    params.initiatorDepositTokenAddress = initiatorDepositTokenAddress;
    params.responderDepositTokenAddress = responderDepositTokenAddress;

    return [requestHandler.getShardedQueue(multisigAddress)];
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallParams
  ): Promise<Node.ProposeInstallResult> {
    const { store, publicIdentifier, messagingService } = requestHandler;

    const { proposedToIdentifier } = params;

    const appInstanceId = await createProposedAppInstance(
      publicIdentifier,
      store,
      params
    );

    const proposalMsg: ProposeMessage = {
      from: publicIdentifier,
      type: NODE_EVENTS.PROPOSE_INSTALL,
      data: { params, appInstanceId }
    };

    await messagingService.send(proposedToIdentifier, proposalMsg);

    return {
      appInstanceId
    };
  }
}

function assertSufficientFundsWithinFreeBalance(
  channel: StateChannel,
  publicIdentifier: string,
  tokenAddress: string,
  depositAmount: BigNumber
) {
  const freeBalanceForToken = getBalancesFromFreeBalanceAppInstance(
    channel.freeBalance,
    tokenAddress
  )[xkeyKthAddress(publicIdentifier, 0)];

  if (freeBalanceForToken.lt(depositAmount)) {
    throw new Error(
      INSUFFICIENT_FUNDS_IN_FREE_BALANCE_FOR_ASSET(
        publicIdentifier,
        channel.multisigAddress,
        tokenAddress,
        freeBalanceForToken,
        depositAmount
      )
    );
  }
}
