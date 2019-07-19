import { Node } from "@counterfactual/types";

import { Protocol } from "../../../machine";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../models/free-balance";
import { RequestHandler } from "../../../request-handler";
import { getPeersAddressFromChannel } from "../../../utils";

export async function runWithdrawProtocol(
  requestHandler: RequestHandler,
  params: Node.WithdrawParams
) {
  const { publicIdentifier, instructionExecutor, store } = requestHandler;
  const { multisigAddress, amount } = params;

  const tokenAddress = params.tokenAddress || CONVENTION_FOR_ETH_TOKEN_ADDRESS;

  const [peerAddress] = await getPeersAddressFromChannel(
    publicIdentifier,
    store,
    multisigAddress
  );

  const stateChannel = await store.getStateChannel(multisigAddress);

  const stateChannelsMap = await instructionExecutor.initiateProtocol(
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

  await store.saveStateChannel(stateChannelsMap.get(multisigAddress)!);
}
