import { Node } from "@counterfactual/types";
import { AddressZero } from "ethers/constants";

import { InstructionExecutor, StateChannel } from "../../../machine";
import { ProposedAppInstanceInfo } from "../../../models";
import { Store } from "../../../store";
import { ERRORS } from "../../errors";

export async function install(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingAddress: string,
  respondingAddress: string,
  params: Node.InstallParams
): Promise<ProposedAppInstanceInfo> {
  const { appInstanceId } = params;

  if (!appInstanceId || !appInstanceId.trim()) {
    return Promise.reject(ERRORS.NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  const appInstanceInfo = await store.getProposedAppInstanceInfo(appInstanceId);

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  const stateChannelsMap = await instructionExecutor.runInstallProtocol(
    new Map<string, StateChannel>([
      // TODO: (architectural decision) Should this use `getAllChannels` or
      //       is this good enough? InstallProtocol only operates on a single
      //       channel, anyway. PR #532 might make this question obsolete.
      [stateChannel.multisigAddress, stateChannel]
    ]),
    {
      initiatingXpub: appInstanceInfo.proposedToIdentifier,
      respondingXpub: appInstanceInfo.proposedByIdentifier,
      multisigAddress: stateChannel.multisigAddress,
      aliceBalanceDecrement: appInstanceInfo.myDeposit,
      bobBalanceDecrement: appInstanceInfo.peerDeposit,
      signingKeys: stateChannel.getNextSigningKeys(),
      initialState: appInstanceInfo.initialState,
      terms: {
        assetType: appInstanceInfo.asset.assetType,
        limit: appInstanceInfo.myDeposit.add(appInstanceInfo.peerDeposit),
        token: appInstanceInfo.asset.token || AddressZero
      },
      appInterface: {
        ...appInstanceInfo.abiEncodings,
        addr: appInstanceInfo.appId
      },
      defaultTimeout: appInstanceInfo.timeout.toNumber()
    }
  );

  await store.saveStateChannel(
    stateChannelsMap.get(stateChannel.multisigAddress)!
  );

  await store.saveRealizedProposedAppInstance(appInstanceInfo);

  return appInstanceInfo;
}
