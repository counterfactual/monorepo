import {
  AppInstance,
  InstructionExecutor,
  StateChannel
} from "@counterfactual/machine";
import {
  AppInstanceInfo,
  AppInterface,
  Node,
  Terms
} from "@counterfactual/types";
import { AddressZero } from "ethers/constants";

import { ProposedAppInstanceInfo } from "../../../models";
import { Store } from "../../../store";
import { ERRORS } from "../../errors";

export async function installVirtual(
  store: Store,
  instructionExecutor: InstructionExecutor,
  initiatingAddress: string,
  respondingAddress: string,
  params: Node.InstallParams
): Promise<AppInstanceInfo> {
  const { appInstanceId } = params;
  if (
    !appInstanceId ||
    (typeof appInstanceId === "string" && appInstanceId.trim() === "")
  ) {
    return Promise.reject(ERRORS.NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  const appInstanceInfo = await store.getProposedAppInstanceInfo(appInstanceId);

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

  // TODO: Replace with `runInstallVirtualAppProtocol`
  await store.saveStateChannel(
    stateChannel.installApp(
      createAppInstanceFromAppInstanceInfo(appInstanceInfo, stateChannel),
      appInstanceInfo.myDeposit,
      appInstanceInfo.peerDeposit
    )
  );

  await store.saveRealizedProposedAppInstance(
    createAppInstanceFromAppInstanceInfo(appInstanceInfo, stateChannel)
      .identityHash,
    appInstanceInfo
  );

  return appInstanceInfo;
}

function createAppInstanceFromAppInstanceInfo(
  proposedAppInstanceInfo: ProposedAppInstanceInfo,
  channel: StateChannel
): AppInstance {
  const appInterface: AppInterface = {
    ...proposedAppInstanceInfo.abiEncodings,
    addr: proposedAppInstanceInfo.appId
  };

  // TODO: throw if asset type is ETH and token is also set
  const terms: Terms = {
    assetType: proposedAppInstanceInfo.asset.assetType,
    limit: proposedAppInstanceInfo.myDeposit.add(
      proposedAppInstanceInfo.peerDeposit
    ),
    token: proposedAppInstanceInfo.asset.token || AddressZero
  };

  return new AppInstance(
    channel.multisigAddress,
    channel.getSigningKeysFor(channel.numInstalledApps),
    proposedAppInstanceInfo.timeout.toNumber(),
    appInterface,
    terms,
    // TODO: pass correct value when virtual app support gets added
    false,
    // TODO: this should be thread-safe
    channel.numInstalledApps,
    channel.rootNonceValue,
    proposedAppInstanceInfo.initialState,
    0,
    proposedAppInstanceInfo.timeout.toNumber()
  );
}
