import { NetworkContext, Node } from "@counterfactual/types";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../constants";
import { AppInstanceProposal, StateChannel } from "../../../models";
import { Store } from "../../../store";
import { getCreate2MultisigAddress, prettyPrintObject } from "../../../utils";
import { NO_STATE_CHANNEL_FOR_MULTISIG_ADDR } from "../../errors";

/**
 * Creates a AppInstanceProposal to reflect the proposal received from
 * the client.
 * @param myIdentifier
 * @param store
 * @param params
 */
export async function createProposedVirtualAppInstance(
  myIdentifier: string,
  store: Store,
  params: Node.ProposeInstallVirtualParams,
  networkContext: NetworkContext
): Promise<string> {
  const { intermediaryIdentifier, proposedToIdentifier } = params;

  const multisigAddress = getCreate2MultisigAddress(
    [myIdentifier, proposedToIdentifier],
    networkContext.ProxyFactory,
    networkContext.MinimumViableMultisig
  );

  const channel = await getOrCreateStateChannelBetweenVirtualAppParticipants(
    multisigAddress,
    myIdentifier,
    proposedToIdentifier,
    intermediaryIdentifier,
    store,
    networkContext
  );

  const appInstanceProposal = new AppInstanceProposal(
    {
      ...params,
      proposedByIdentifier: myIdentifier,
      initiatorDepositTokenAddress:
        params.initiatorDepositTokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS,
      responderDepositTokenAddress:
        params.responderDepositTokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS
    },
    channel
  );

  await store.addVirtualAppInstanceProposal(appInstanceProposal);

  await store.saveStateChannel(channel.bumpProposedApps());

  return appInstanceProposal.identityHash;
}

/**
 * This determines which Node is the Node to send the msg to next during any
 * Virtual AppInstance operations.
 * @param thisAddress
 * @param intermediaryIdentifier
 * @param responderAddress
 */
export function getNextNodeAddress(
  thisAddress: string,
  intermediaryIdentifier: string,
  responderAddress: string
): string {
  if (thisAddress === intermediaryIdentifier) {
    return responderAddress;
  }
  return intermediaryIdentifier;
}

export function isNodeIntermediary(
  thisAddress: string,
  intermediaryIdentifier: string
): boolean {
  return intermediaryIdentifier === thisAddress;
}

export async function getOrCreateStateChannelBetweenVirtualAppParticipants(
  multisigAddress: string,
  initiatorXpub: string,
  responderXpub: string,
  hubXpub: string,
  store: Store,
  networkContext: NetworkContext
): Promise<StateChannel> {
  try {
    return await store.getStateChannel(multisigAddress);
  } catch (e) {
    if (
      e
        .toString()
        .includes(NO_STATE_CHANNEL_FOR_MULTISIG_ADDR(multisigAddress)) &&
      hubXpub !== undefined
    ) {
      const stateChannel = StateChannel.createEmptyChannel(multisigAddress, [
        initiatorXpub,
        responderXpub
      ]);

      await store.saveStateChannel(stateChannel);

      return stateChannel;
    }

    throw Error(prettyPrintObject(e));
  }
}
