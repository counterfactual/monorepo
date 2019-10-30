import { AppInstanceProposal, Node } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

import { Protocol, ProtocolRunner } from "../../../engine";
import { StateChannel } from "../../../models";
import { Store } from "../../../store";
import { NO_APP_INSTANCE_ID_TO_INSTALL } from "../../errors";

export async function install(
  store: Store,
  protocolRunner: ProtocolRunner,
  params: Node.InstallParams
): Promise<AppInstanceProposal> {
  const { appInstanceId } = params;

  if (!appInstanceId || !appInstanceId.trim()) {
    throw Error(NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  const proposal = await store.getAppInstanceProposal(appInstanceId);

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  await protocolRunner.initiateProtocol(Protocol.Install, {
    initiatorXpub: proposal.proposedToIdentifier,
    responderXpub: proposal.proposedByIdentifier,
    initiatorBalanceDecrement: bigNumberify(proposal.initiatorDeposit),
    responderBalanceDecrement: bigNumberify(proposal.responderDeposit),
    multisigAddress: stateChannel.multisigAddress,
    participants: stateChannel.getSigningKeysFor(proposal.appSeqNo),
    initialState: proposal.initialState,
    appInterface: {
      ...proposal.abiEncodings,
      addr: proposal.appDefinition
    },
    appSeqNo: proposal.appSeqNo,
    defaultTimeout: bigNumberify(proposal.timeout).toNumber(),
    outcomeType: proposal.outcomeType,
    initiatorDepositTokenAddress: proposal.initiatorDepositTokenAddress,
    responderDepositTokenAddress: proposal.responderDepositTokenAddress,
    disableLimit: false
  });

  await store.saveStateChannel(
    (await store.getChannelFromAppInstanceID(appInstanceId)).removeProposal(
      appInstanceId
    )
  );

  return proposal;
}
