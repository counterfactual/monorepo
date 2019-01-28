import {
  AppInstance,
  InstructionExecutor,
  StateChannel,
  xkeysToSortedKthAddresses
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
  proposedByIdentifier: string,
  proposedToIdentifier: string,
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

  await instructionExecutor.runInstallVirtualAppProtocol(
    new Map(Object.entries(await store.getAllChannels())),
    {
      // TODO: Explain why appInstanceInfo.{initiating...,respomding...} are
      //       incorrect to use at this point since it is non obvious.
      initiatingAddress,
      respondingAddress,
      multisig1Address: stateChannel.multisigAddress,
      multisig2Address: stateChannel.multisigAddress, // FIXME: not right
      intermediaryAddress: appInstanceInfo.intermediaries![0],
      signingKeys: [
        appInstanceInfo.initiatingAddress,
        appInstanceInfo.respondingAddress
      ],
      defaultTimeout: appInstanceInfo.timeout.toNumber(),
      appInterface: {
        addr: appInstanceInfo.appId,
        ...appInstanceInfo.abiEncodings
      },
      initialState: appInstanceInfo.initialState,
      initiatingBalanceDecrement: appInstanceInfo.myDeposit,
      respondingBalanceDecrement: appInstanceInfo.peerDeposit
    }
  );

  // const updatedStateChannel = stateChannel.installApp(
  //   createAppInstanceFromAppInstanceInfo(appInstanceInfo, stateChannel),
  //   appInstanceInfo.myDeposit,
  //   appInstanceInfo.peerDeposit
  // );

  // TODO: Replace with `runInstallVirtualAppProtocol`
  await store.saveStateChannel(
    stateChannel.installApp(
      createAppInstanceFromAppInstanceInfo(appInstanceInfo, stateChannel),
      appInstanceInfo.myDeposit,
      appInstanceInfo.peerDeposit
    )
  );

  await store.saveRealizedProposedAppInstance(appInstanceInfo);

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
    AddressZero,
    // FIXME: Incorrect for virtual app atm
    xkeysToSortedKthAddresses(
      [
        proposedAppInstanceInfo.proposedByIdentifier,
        proposedAppInstanceInfo.proposedToIdentifier
      ],
      0
    ),
    proposedAppInstanceInfo.timeout.toNumber(),
    appInterface,
    terms,
    true,
    channel.numInstalledApps, // FIXME: Incorrect for virtual app atm
    channel.rootNonceValue,
    proposedAppInstanceInfo.initialState,
    0,
    proposedAppInstanceInfo.timeout.toNumber()
  );
}
