import { xkeyKthAddress } from "@counterfactual/machine/dist/src/xkeys";
import { Node } from "@counterfactual/types";

import { RequestHandler } from "../../../request-handler";
import { getPeersAddressFromChannel } from "../../../utils";

export async function runWithdrawProtocol(
  requestHandler: RequestHandler,
  params: Node.DepositParams
) {
  const { publicIdentifier, instructionExecutor, store } = requestHandler;
  const { multisigAddress, amount } = params;

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
      initiatingXpub: publicIdentifier,
      respondingXpub: peerAddress,
      multisigAddress: stateChannel.multisigAddress,
      recipient: xkeyKthAddress(publicIdentifier, 0)
    }
  );

  await store.saveStateChannel(stateChannelsMap.get(multisigAddress)!);
}
