import { Node } from "@counterfactual/types";
import { bigNumberify, BigNumberish } from "ethers/utils";

import { StateChannelJSON } from "../models/state-channel";

const DB_NAMESPACE_CHANNEL = "channel";
const DB_NAMESPACE_WITHDRAWALS = "multisigAddressToWithdrawalCommitment";
const DB_NAMESPACE_ALL_COMMITMENTS = "allCommitments";

const bigNumberIshToString = (x: BigNumberish) => bigNumberify(x).toHexString();

export const migrateToPatch1 = async (
  storeService: Node.IStoreService,
  storeKeyPrefix: string
) => {
  const stateChannelsMap: {
    [multisigAddress: string]: StateChannelJSON;
  } = await storeService.get(`${storeKeyPrefix}/${DB_NAMESPACE_CHANNEL}`);

  for (const multisigAddress in stateChannelsMap) {
    /**
     * Update proposal:
     * https://github.com/counterfactual/monorepo/pull/2542/files
     */

    const proposals = stateChannelsMap[multisigAddress].proposedAppInstances;

    for (let i = 0; i < proposals.length; i++) {
      const proposal = proposals[i][1];
      stateChannelsMap[multisigAddress].proposedAppInstances[i][1] = {
        ...proposal,
        initiatorDeposit: bigNumberIshToString(proposal.initiatorDeposit),
        responderDeposit: bigNumberIshToString(proposal.responderDeposit),
        timeout: bigNumberIshToString(proposal.timeout)
      };
    }

    /**
     * Update interpreter params
     * https://github.com/counterfactual/monorepo/pull/2544/files#diff-95c2150ee50c44be12700a72fd6fbf73R32
     */

    const apps = stateChannelsMap[multisigAddress].appInstances;

    for (let i = 0; i < apps.length; i++) {
      const app = apps[i][1];

      if (app.twoPartyOutcomeInterpreterParams) {
        stateChannelsMap[multisigAddress].appInstances[
          i
        ][1].twoPartyOutcomeInterpreterParams = {
          ...app.twoPartyOutcomeInterpreterParams!,
          amount: bigNumberIshToString(
            app.twoPartyOutcomeInterpreterParams!.amount
          )
        };
      }

      if (app.singleAssetTwoPartyCoinTransferInterpreterParams) {
        stateChannelsMap[multisigAddress].appInstances[
          i
        ][1].singleAssetTwoPartyCoinTransferInterpreterParams = {
          ...app.singleAssetTwoPartyCoinTransferInterpreterParams!,
          limit: bigNumberIshToString(
            app.singleAssetTwoPartyCoinTransferInterpreterParams!.limit
          )
        };
      }

      if (app.multiAssetMultiPartyCoinTransferInterpreterParams) {
        stateChannelsMap[multisigAddress].appInstances[
          i
        ][1].multiAssetMultiPartyCoinTransferInterpreterParams = {
          ...app.multiAssetMultiPartyCoinTransferInterpreterParams!,
          limit: app.multiAssetMultiPartyCoinTransferInterpreterParams.limit.map(
            bigNumberIshToString!
          )
        };
      }
    }

    /**
     * Delete createdAt
     * https://github.com/counterfactual/monorepo/pull/2541/files
     */
    delete stateChannelsMap[multisigAddress]["createdAt"];

    /**
     * https://github.com/counterfactual/monorepo/pull/2538/files
     */

    const agreements =
      stateChannelsMap[multisigAddress]
        .singleAssetTwoPartyIntermediaryAgreements;

    for (let i = 0; i < agreements.length; i++) {
      const agreement = agreements[i][1];
      stateChannelsMap[
        multisigAddress
      ].singleAssetTwoPartyIntermediaryAgreements[i][1] = {
        ...agreements[i][1],
        capitalProvided: bigNumberIshToString(agreement.capitalProvided)
      };
    }
  }

  const withdrawals = await storeService.get(
    `${storeKeyPrefix}/${DB_NAMESPACE_WITHDRAWALS}`
  );

  const commitments = await storeService.get(
    `${storeKeyPrefix}/${DB_NAMESPACE_ALL_COMMITMENTS}`
  );

  const sharedData = {
    commitments,
    withdrawals,
    stateChannelsMap,
    version: 1
  };

  await storeService.set([{ path: storeKeyPrefix, value: sharedData }]);
};
