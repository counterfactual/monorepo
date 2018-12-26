import { legacy } from "@counterfactual/cf.js";
import { Address, AppInstanceInfo, AssetType } from "@counterfactual/types";
import { Zero } from "ethers/constants";

import Nonce = legacy.utils.Nonce;
import FreeBalance = legacy.utils.FreeBalance;

/**
 * The schema of a channel is below.

/**
 * The fully expanded schema for a channel:
 * multisigAddress: {
 *  multisigAddress: Address,
 *  multisigOwners: Address[],
 *  rootNonce: Nonce,
 *  appInstances: Map<AppInstanceID,
 *    appInstance: {
 *      id: string,
 *      appId: Address,
 *      abiEncodings: {
 *        stateEncoding: string,
 *        actionEncoding: string
 *      },
 *      appState: any,
 *      localNonceCount: number,
 *      uninstallationNonce: {
 *        isSet: boolean,
 *        salt: string,
 *        nonceValue: number
 *      },
 *      timeout: BigNumber,
 *      asset: {
 *        assetType: AssetType,
 *        token?: Address
 *      },
 *      deposits: Map<Address, BigNumber>
 *    }
 *  },
 *  proposedAppInstances: same schema as appInstances,
 *  freeBalances: Map<AssetType,
 *    freeBalance: {
 *      alice: Address,
 *      aliceBalance: BigNumber,
 *      bob: Address,
 *      bobBalance: BigNumber,
 *      localNonceCount: number,
 *      timeout: number,
 *      dependencyNonce: {
 *        isSet: boolean,
 *        salt: string,
 *        nonceValue: number
 *      }
 *    }
 *  }
 * }
 */

type AppInstancesMap = { [key: string]: AppInstanceInfo };

const INITIAL_NONCE = new Nonce(false, 0, 0);

/**
 * This class is only a type implementation of a channel schema for the
 * purposes of updating and retrieving a channel's state from the store.
 *
 * An instance is by itself stateless and effectively reflects the state of an
 * according channel in the store.
 */
export class Channel {
  constructor(
    readonly multisigAddress: Address,
    readonly multisigOwners: Address[],
    readonly rootNonce: Nonce = INITIAL_NONCE,
    readonly freeBalances: {
      [assetType: number]: FreeBalance;
    } = Channel.initialFreeBalances(multisigOwners, rootNonce),
    readonly appInstances: AppInstancesMap = {},
    readonly proposedAppInstances: AppInstancesMap = {}
  ) {}

  static initialFreeBalances(
    multisigOwners: Address[],
    initialAppsNonce: Nonce
  ): {
    [assetType: number]: FreeBalance;
  } {
    // TODO: extend to all asset types
    const ethFreeBalance = new FreeBalance(
      multisigOwners[0],
      Zero,
      multisigOwners[1],
      Zero,
      0,
      0,
      0,
      initialAppsNonce
    );
    return {
      [AssetType.ETH]: ethFreeBalance
    };
  }
}

/**
 * Used in standardizing how to set/get app instances within a channel according
 * to their correct status.
 */
export enum APP_INSTANCE_STATUS {
  INSTALLED = "installed",
  PROPOSED = "proposed"
}
