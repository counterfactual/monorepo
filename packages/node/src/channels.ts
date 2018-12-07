import { legacy } from "@counterfactual/cf.js";
import {
  Address,
  AppABIEncodings,
  AppInstanceID,
  AppInstanceInfo,
  AssetType,
  Node
} from "@counterfactual/common-types";
import { ethers } from "ethers";

import { IStoreService } from "./service-interfaces";

type Nonce = legacy.utils.Nonce;

/**
 * This file encapsulates the schema, state, and persistence of all the channels.
 */

/**
 * The fully expanded schema for a channel is:
 * multisigAddress: {
 *  multisigAddress: Address,
 *  multisigOwners: Address[],
 *  appNonceCount: number,
 *  appInstances: Map<AppInstanceID,
 *    appInstance: {
 *      id: string,
 *      appId: Address,
 *      abiEncodings: {
 *        stateEncoding: string,
 *        actionEncoding: string
 *      },
 *      appState: any,
 *      localNonce: Nonce,
 *      timeout: BigNumber,
 *      asset: {
 *        assetType: AssetType,
 *        limit: BigNumber
 *        token?: Address
 *      },
 *      deposits: Map<Address, BigNumber>
 *    }
 *  },
 *  freeBalances: Map<AssetType,
 *    freeBalance: {
 *      alice: Address,
 *      aliceBalance: BigNumber,
 *      bob: Address,
 *      bobBalance: BigNumber,
 *      uniqueId: number,
 *      localNonce: number,
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

interface FreeBalances {
  // based on AssetType enum
  [assetType: number]: {
    // TODO: rename free balance properties
    alice: Address;
    aliceBalance: ethers.utils.BigNumber;
    bob: Address;
    bobBalance: ethers.utils.BigNumber;
    uniqueId: number;
    localNonce: number;
    timeout: number;
    dependencyNonce: Nonce;
  };
}
class Channel {
  private appsNonce: number = 0;
  private appInstances: {
    [appInstanceID: string]: {
      id: AppInstanceID;
      appId: Address;
      abiEncodings: AppABIEncodings;
      appState: any;
      localNonce: Nonce;
      timeout: ethers.utils.BigNumber;
      blockchainAsset: {
        assetType: AssetType;
        limit: ethers.utils.BigNumber;
        token?: Address;
      };
      deposits: {
        [address: string]: ethers.utils.BigNumber;
      };
    };
  } = {};

  constructor(
    private readonly multisigAddress: Address,
    private readonly multisigOwners: Address[],
    private readonly freeBalances: FreeBalances
  ) {
    console.log(
      this.multisigAddress,
      this.multisigOwners,
      this.freeBalances,
      this.appsNonce,
      this.appInstances
    );
  }

  toJson(): string {
    return "";
  }

  static fromJson(serializedChannel: string) {}
}

export class Channels {
  /**
   * A convenience struct to lookup multisig address from a set of owners.
   */
  private readonly ownersToMultisigAddress = new Map<Address[], Address>();

  /**
   * @param address The address of the account being used with the Node.
   * @param store
   * @param multisigKeyPrefix The prefix to add to the key being used
   *        for indexing multisig addresses according to the execution
   *        environment.
   */
  constructor(
    private readonly address: Address,
    private readonly store: IStoreService,
    private readonly multisigKeyPrefix: string
  ) {}

  addChannel(
    multisigAddress: Address,
    multisigOwners: Address[],
    freeBalances: FreeBalances
  ) {
    const channel: Channel = new Channel(
      multisigAddress,
      multisigOwners,
      freeBalances
    );
    this.store.set(
      `${this.multisigKeyPrefix}-${multisigAddress}`,
      channel.toJson()
    );

    this.store.add(this.multisigKeyPrefix, multisigAddress);
  }

  // @ts-ignore
  private async getChannel(peerAddress: Address): Promise<Channel> {
    const owners = canonicalizeAddresses([this.address, peerAddress]);
    if (!this.ownersToMultisigAddress.has(owners)) {
      throw Error(`No channel exists with the specified peer: ${peerAddress}`);
    }
    const multisigAddress = this.ownersToMultisigAddress.get(
      canonicalizeAddresses([this.address, peerAddress])
    )!;
    const channelJSON = await this.store.get(multisigAddress);
    console.log("got channel: ", channelJSON);
    return Promise.resolve({} as any);
  }

  async getAllApps(): Promise<AppInstanceInfo[]> {
    const apps: AppInstanceInfo[] = [];
    return apps;
  }

  async proposeInstall(params: Node.ProposeInstallParams): Promise<string> {
    // const channel = this.getChannel(params.peerAddress);
    // TODO: generate unique ID for the proposed app
    return "1";
  }
}

function canonicalizeAddresses(addresses: Address[]): Address[] {
  addresses.sort((addrA: Address, addrB: Address) => {
    return new ethers.utils.BigNumber(addrA).lt(addrB) ? -1 : 1;
  });
  return addresses;
}
