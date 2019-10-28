import { Node } from "@counterfactual/types";
import { bigNumberify } from "ethers/utils";

import { StateChannelJSON } from "../models/state-channel";

const DB_NAMESPACE_CHANNEL = "channel";
const DB_NAMESPACE_WITHDRAWALS = "multisigAddressToWithdrawalCommitment";
const DB_NAMESPACE_ALL_COMMITMENTS = "allCommitments";

export const migrateToPatch1 = async (
  storeService: Node.IStoreService,
  storeKeyPrefix: string
) => {
  const oldData = await storeService.get(`${storeKeyPrefix}`);

  const stateChannelsMap: { [multisigAddress: string]: StateChannelJSON } =
    oldData[DB_NAMESPACE_CHANNEL];

  for (const multisigAddress in stateChannelsMap) {
    const agreements =
      stateChannelsMap[multisigAddress]
        .singleAssetTwoPartyIntermediaryAgreements;

    for (let i = 0; i < agreements.length; i++) {
      stateChannelsMap[
        multisigAddress
      ].singleAssetTwoPartyIntermediaryAgreements[i][1] = {
        ...agreements[i][1],
        capitalProvided: bigNumberify(
          agreements[i][1].capitalProvided
        ).toHexString()
      };
    }

    // TODO: Repeat this { _hex: string } to string conversion
    // for all other places where BigNumber was replaced by string
  }

  const withdrawals = oldData[DB_NAMESPACE_WITHDRAWALS];

  const commitments = oldData[DB_NAMESPACE_ALL_COMMITMENTS];

  const sharedData = {
    commitments,
    withdrawals,
    stateChannelsMap,
    version: 1
  };

  await this.storeService.set([{ path: storeKeyPrefix, value: sharedData }]);
};
