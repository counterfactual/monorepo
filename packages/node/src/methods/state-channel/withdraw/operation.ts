import { xkeyKthAddress } from "@counterfactual/machine";
import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { getPeersAddressFromChannel } from "../../../utils";

export async function runWithdrawProtocol(
  requestHandler: RequestHandler,
  params: Node.WithdrawParams
) {
  const { publicIdentifier, instructionExecutor, store } = requestHandler;
  const { multisigAddress, amount, recipient } = params;

  const [peerAddress] = await getPeersAddressFromChannel(
    publicIdentifier,
    store,
    multisigAddress
  );

  const stateChannel = await store.getStateChannel(multisigAddress);

  const stateChannelsMap = await instructionExecutor.runWithdrawProtocol(
    stateChannel,
    {
      amount,
      recipient,
      initiatingXpub: publicIdentifier,
      respondingXpub: peerAddress,
      multisigAddress: stateChannel.multisigAddress
    }
  );

  await store.saveStateChannel(stateChannelsMap.get(multisigAddress)!);
}
