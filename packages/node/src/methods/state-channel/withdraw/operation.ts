import { Node } from "@counterfactual/types";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../constants";
import { Protocol } from "../../../machine";
import { StateChannel } from "../../../models";
import { RequestHandler } from "../../../request-handler";

export async function runWithdrawProtocol(
  requestHandler: RequestHandler,
  params: Node.WithdrawParams
) {
  const { publicIdentifier, protocolRunner, store } = requestHandler;
  const { multisigAddress, amount } = params;

  const tokenAddress = params.tokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS;

  const [peerAddress] = await StateChannel.getPeersAddressFromChannel(
    publicIdentifier,
    store,
    multisigAddress
  );

  const stateChannel = await store.getStateChannel(multisigAddress);

  await protocolRunner.initiateProtocol(
    Protocol.Withdraw,
    new Map([[stateChannel.multisigAddress, stateChannel]]),
    {
      amount,
      tokenAddress,
      recipient: params.recipient as string,
      initiatorXpub: publicIdentifier,
      responderXpub: peerAddress,
      multisigAddress: stateChannel.multisigAddress
    }
  );
}
