import { Node } from "@counterfactual/types";
import { BigNumber } from "ethers/utils";
import { jsonRpcMethod } from "rpc-server";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../constants";
import { xkeyKthAddress } from "../../../machine";
import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";
import { NODE_EVENTS, ProposeMessage } from "../../../types";
import { getCreate2MultisigAddress } from "../../../utils";
import { NodeController } from "../../controller";
import {
  INSUFFICIENT_FUNDS_IN_FREE_BALANCE_FOR_ASSET,
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
  @jsonRpcMethod(Node.RpcMethodName.PROPOSE_INSTALL)
  public executeMethod = super.executeMethod;

  protected async getRequiredLockNames(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallParams
  ): Promise<string[]> {
    const { publicIdentifier, networkContext } = requestHandler;
    const { proposedToIdentifier } = params;

    const multisigAddress = getCreate2MultisigAddress(
      [publicIdentifier, proposedToIdentifier],
      networkContext.ProxyFactory,
      networkContext.MinimumViableMultisig
    );

    return [multisigAddress];
  }

  protected async beforeExecution(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallParams
  ) {
    const { store, publicIdentifier, networkContext } = requestHandler;
    const { initialState } = params;

    if (!initialState) {
      throw Error(NULL_INITIAL_STATE_FOR_PROPOSAL);
    }

    const {
      proposedToIdentifier,
      initiatorDeposit,
      responderDeposit,
      initiatorDepositTokenAddress: initiatorDepositTokenAddressParam,
      responderDepositTokenAddress: responderDepositTokenAddressParam
    } = params;

    const myIdentifier = publicIdentifier;

    const multisigAddress = getCreate2MultisigAddress(
      [myIdentifier, proposedToIdentifier],
      networkContext.ProxyFactory,
      networkContext.MinimumViableMultisig
    );

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
  }

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.ProposeInstallParams
  ): Promise<Node.ProposeInstallResult> {
    const {
      store,
      publicIdentifier,
      messagingService,
      networkContext
    } = requestHandler;

    const { proposedToIdentifier } = params;

    const appInstanceId = await createProposedAppInstance(
      publicIdentifier,
      store,
      networkContext,
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
  const freeBalanceForToken = channel
    .getFreeBalanceClass()
    .getBalance(tokenAddress, xkeyKthAddress(publicIdentifier, 0));

  if (freeBalanceForToken.lt(depositAmount)) {
    throw Error(
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
