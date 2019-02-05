import { AppInstance, StateChannel } from "@counterfactual/machine";
import { AppInterface, Terms } from "@counterfactual/types";
import { AddressZero } from "ethers/constants";

import { ERRORS } from "../../methods/errors";
import { ProposedAppInstanceInfo } from "../../models";
import { RequestHandler } from "../../request-handler";
import { InstallMessage } from "../../types";

/**
 * This function responds to a installation proposal approval from a peer Node
 * by counter installing the AppInstance this Node proposed earlier.
 *
 * NOTE: The following code is mostly just a copy of the code from the
 *       methods/intall/operations.ts::install method with the exception
 *       of the lack of a runInstallProtocol call. This is because this is
 *       the counterparty end of the install protocol which runs _after_
 *       the _runProtocolWithMessage_ call finishes and saves the result.
 *
 *       Future iterations of this code will simply be a middleware hook on
 *       the _STATE TRANSITION COMMIT_ opcode.
 */
export default async function installEventController(
  requestHandler: RequestHandler,
  nodeMsg: InstallMessage
) {
  const store = requestHandler.store;
  const params = nodeMsg.data.params;

  const { appInstanceId } = params;

  if (!appInstanceId || !appInstanceId.trim()) {
    throw new Error(ERRORS.NO_APP_INSTANCE_ID_TO_INSTALL);
  }

  const appInstanceInfo = await store.getProposedAppInstanceInfo(appInstanceId);

  const stateChannel = await store.getChannelFromAppInstanceID(appInstanceId);

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
    channel.getSigningKeysFor(channel.numInstalledApps - 1),
    proposedAppInstanceInfo.timeout.toNumber(),
    appInterface,
    terms,
    // TODO: pass correct value when virtual app support gets added
    false,
    // TODO: this should be thread-safe
    channel.numInstalledApps - 1,
    channel.rootNonceValue,
    proposedAppInstanceInfo.initialState,
    0,
    proposedAppInstanceInfo.timeout.toNumber()
  );
}
