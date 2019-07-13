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
 * @param params
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
    const { store } = requestHandler;
    const {
      proposedToIdentifier,
      myDeposit,
      myDepositTokenAddress: myDepositTokenAddressParam,
      peerDeposit,
      peerDepositTokenAddress: peerDepositTokenAddressParam
    } = params;

    const myIdentifier = requestHandler.publicIdentifier;

    const multisigAddress = await store.getMultisigAddressFromOwnersHash(
      hashOfOrderedPublicIdentifiers([myIdentifier, proposedToIdentifier])
    );

    // TODO: DRY this at top level of most calls that query a channel
    if (!multisigAddress) {
      throw new Error(
        NO_CHANNEL_BETWEEN_NODES(myIdentifier, proposedToIdentifier)
      );
    }

    const myDepositTokenAddress =
      myDepositTokenAddressParam || CONVENTION_FOR_ETH_TOKEN_ADDRESS;

    const peerDepositTokenAddress =
      peerDepositTokenAddressParam || CONVENTION_FOR_ETH_TOKEN_ADDRESS;

    const channel = await store.getStateChannel(multisigAddress);

    confirmSufficientBalanceForToken(
      channel,
      multisigAddress,
      myIdentifier,
      myDepositTokenAddress,
      myDeposit
    );

    confirmSufficientBalanceForToken(
      channel,
      multisigAddress,
      proposedToIdentifier,
      peerDepositTokenAddress,
      peerDeposit
    );

    params.myDepositTokenAddress = myDepositTokenAddress;
    params.peerDepositTokenAddress = peerDepositTokenAddress;

    return [requestHandler.getShardedQueue(multisigAddress)];
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallParams
  ): Promise<Node.ProposeInstallResult> {
    const { store, publicIdentifier, messagingService } = requestHandler;
    const { initialState } = params;

    if (!initialState) {
      return Promise.reject(NULL_INITIAL_STATE_FOR_PROPOSAL);
    }

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

    await messagingService.send(params.proposedToIdentifier, proposalMsg);

    return {
      appInstanceId
    };
  }
}

function confirmSufficientBalanceForToken(
  channel: StateChannel,
  multisigAddress: string,
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
        multisigAddress,
        tokenAddress,
        freeBalanceForToken,
        depositAmount
      )
    );
  }
}
