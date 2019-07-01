import {
  ETHBucketAppState,
  SolidityABIEncoderV2Type
} from "@counterfactual/types";
import { MaxUint256, Zero } from "ethers/constants";
import { BigNumber } from "ethers/utils";

import {
  flip,
  fromAppState,
  getETHBucketAppInterface,
  merge
} from "../ethereum/utils/eth-bucket";
import { xkeyKthAddress, xkeysToSortedKthAddresses } from "../machine/xkeys";

import { AppInstance, AppInstanceJson } from "./app-instance";
import {
  TwoPartyVirtualEthAsLumpInstance,
  TwoPartyVirtualEthAsLumpInstanceJson
} from "./two-party-virtual-eth-as-lump-instance";

// TODO: Hmmm this code should probably be somewhere else?
const HARD_CODED_ASSUMPTIONS = {
  freeBalanceDefaultTimeout: 172800,
  freeBalanceInitialStateTimeout: 172800,
  // We assume the Free Balance is the first app ever installed
  appSequenceNumberForFreeBalance: 0
};

const NONCE_EXPIRY = 65536;

const ERRORS = {
  APPS_NOT_EMPTY: (size: number) =>
    `Expected the appInstances list to be empty but size ${size}`,
  APP_DOES_NOT_EXIST: (identityHash: string) =>
    `Attempted to edit an appInstance that does not exist: identity hash = ${identityHash}`,
  FREE_BALANCE_MISSING: "Cannot find ETH Free Balance App in StateChannel",
  FREE_BALANCE_IDX_CORRUPT: (idx: string) =>
    `Index ${idx} used to find ETH Free Balance is broken`,
  INSUFFICIENT_FUNDS:
    "Attempted to install an appInstance without sufficient funds",
  MULTISIG_OWNERS_NOT_SORTED:
    "multisigOwners parameter of StateChannel must be sorted"
};

function sortAddresses(addrs: string[]) {
  return addrs.sort((a, b) => (parseInt(a, 16) < parseInt(b, 16) ? -1 : 1));
}

export type StateChannelJSON = {
  readonly multisigAddress: string;
  readonly userNeuteredExtendedKeys: string[];
  readonly appInstances: [string, AppInstanceJson][];
  readonly twoPartyVirtualEthAsLumpInstances: [
    string,
    TwoPartyVirtualEthAsLumpInstanceJson
  ][];
  readonly freeBalanceAppInstance: AppInstanceJson | undefined;
  readonly monotonicNumInstalledApps: number;
  readonly createdAt: number;
};

function createFreeBalance(
  multisigAddress: string,
  userNeuteredExtendedKeys: string[],
  ethBucketAddress: string,
  freeBalanceTimeout: number
) {
  const sortedTopLevelKeys = xkeysToSortedKthAddresses(
    userNeuteredExtendedKeys,
    0 // NOTE: We re-use 0 which is also used as the keys for `multisigOwners`
  );

  // Making these values constants to be extremely explicit about
  // the built-in assumption here.
  const beneficiaryForPerson1 = sortedTopLevelKeys[0];
  const beneficiaryForPerson2 = sortedTopLevelKeys[1];

  return new AppInstance(
    multisigAddress,
    sortedTopLevelKeys,
    freeBalanceTimeout,
    getETHBucketAppInterface(ethBucketAddress),
    false,
    HARD_CODED_ASSUMPTIONS.appSequenceNumberForFreeBalance,
    [
      [
        {
          to: beneficiaryForPerson1,
          amount: Zero
        },
        {
          to: beneficiaryForPerson2,
          amount: Zero
        }
      ]
    ],
    0,
    HARD_CODED_ASSUMPTIONS.freeBalanceInitialStateTimeout,
    undefined,
    { limit: MaxUint256 }
  );
}

export class StateChannel {
  constructor(
    public readonly multisigAddress: string,
    public readonly userNeuteredExtendedKeys: string[],
    readonly appInstances: ReadonlyMap<string, AppInstance> = new Map<
      string,
      AppInstance
    >([]),
    readonly twoPartyVirtualEthAsLumpInstances: ReadonlyMap<
      string,
      TwoPartyVirtualEthAsLumpInstance
    > = new Map<string, TwoPartyVirtualEthAsLumpInstance>([]),
    private readonly freeBalanceAppInstance?: AppInstance,
    private readonly monotonicNumInstalledApps: number = 0,
    public readonly createdAt: number = Date.now()
  ) {
    userNeuteredExtendedKeys.forEach(xpub => {
      if (xpub.slice(0, 4) !== "xpub") {
        throw Error(
          `StateChannel constructor given invalid extended keys: ${userNeuteredExtendedKeys}`
        );
      }
    });
  }

  public get multisigOwners() {
    return this.getSigningKeysFor(0);
  }

  public get numInstalledApps() {
    return this.monotonicNumInstalledApps;
  }

  public get numActiveApps() {
    return this.appInstances.size;
  }

  public getAppInstance(appInstanceIdentityHash: string): AppInstance {
    if (!this.appInstances.has(appInstanceIdentityHash)) {
      throw Error(ERRORS.APP_DOES_NOT_EXIST(appInstanceIdentityHash));
    }
    return this.appInstances.get(appInstanceIdentityHash)!;
  }

  public hasAppInstance(appInstanceId: string): boolean {
    return this.appInstances.has(appInstanceId);
  }

  public hasAppInstanceOfKind(address: string): boolean {
    return (
      Array.from(this.appInstances.values()).filter(
        (appInstance: AppInstance) => {
          return appInstance.appInterface.addr === address;
        }
      ).length > 0
    );
  }

  public getAppInstanceOfKind(address: string) {
    const appInstances = Array.from(this.appInstances.values()).filter(
      (appInstance: AppInstance) => {
        return appInstance.appInterface.addr === address;
      }
    );
    if (appInstances.length !== 1) {
      throw Error(
        `No AppInstance of addr ${address} exists on channel: ${
          this.multisigAddress
        }`
      );
    }
    return appInstances[0];
  }

  public isAppInstanceInstalled(appInstanceIdentityHash: string) {
    return this.appInstances.has(appInstanceIdentityHash);
  }

  public getSigningKeysFor(addressIndex: number): string[] {
    return sortAddresses(
      this.userNeuteredExtendedKeys.map(xpub =>
        xkeyKthAddress(xpub, addressIndex)
      )
    );
  }

  public getNextSigningKeys(): string[] {
    return this.getSigningKeysFor(this.monotonicNumInstalledApps);
  }

  public get freeBalance(): AppInstance {
    if (this.freeBalanceAppInstance) {
      return this.freeBalanceAppInstance;
    }

    throw new Error(
      "There is no free balance app instance installed in this state channel"
    );
  }

  public getFreeBalanceAddrOf(xpub: string): string {
    const [alice, bob] = this.freeBalanceAppInstance!.signingKeys;

    const topLevelKey = xkeyKthAddress(xpub, 0);

    if (topLevelKey !== alice && topLevelKey !== bob) {
      throw Error(
        `getFreeBalanceAddrOf received invalid xpub without free balance account: ${xpub}`
      );
    }

    return topLevelKey;
  }

  public incrementETHFreeBalance(increments: { [addr: string]: BigNumber }) {
    const freeBalance = this.freeBalanceAppInstance;
    const freeBalanceState = freeBalance!.state as ETHBucketAppState;

    return this.setFreeBalance(
      merge(fromAppState(freeBalanceState), increments)
    );
  }

  public setFreeBalance(newState: { [addr: string]: BigNumber }) {
    const freeBalance = this.freeBalance;
    const ret = [] as any;

    for (const beneficiaryAddr in newState) {
      ret.push({
        to: beneficiaryAddr,
        amount: {
          _hex: newState[beneficiaryAddr].toHexString()
        }
      });
    }

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      this.appInstances,
      this.twoPartyVirtualEthAsLumpInstances,
      freeBalance.setState([ret]),
      this.monotonicNumInstalledApps,
      this.createdAt
    );
  }

  public static setupChannel(
    ethBucketAddress: string,
    multisigAddress: string,
    userNeuteredExtendedKeys: string[],
    freeBalanceTimeout?: number
  ) {
    return new StateChannel(
      multisigAddress,
      userNeuteredExtendedKeys,
      new Map<string, AppInstance>([]),
      new Map<string, TwoPartyVirtualEthAsLumpInstance>(),
      createFreeBalance(
        multisigAddress,
        userNeuteredExtendedKeys,
        ethBucketAddress,
        freeBalanceTimeout || HARD_CODED_ASSUMPTIONS.freeBalanceDefaultTimeout
      ),
      1
    );
  }

  public static createEmptyChannel(
    multisigAddress: string,
    userNeuteredExtendedKeys: string[]
  ) {
    return new StateChannel(
      multisigAddress,
      userNeuteredExtendedKeys,
      new Map<string, AppInstance>(),
      new Map<string, TwoPartyVirtualEthAsLumpInstance>(),
      // Note that this FreeBalance is undefined because a channel technically
      // does not have a FreeBalance before the `setup` protocol gets run
      undefined,
      1
    );
  }

  public addVirtualAppInstance(appInstance: AppInstance) {
    if (appInstance.appSeqNo !== this.numInstalledApps) {
      throw Error(
        `Tried to install app with sequence number ${
          appInstance.appSeqNo
        } into channel with ${this.numInstalledApps} active apps`
      );
    }
    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstance.identityHash, appInstance);

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.twoPartyVirtualEthAsLumpInstances,
      this.freeBalanceAppInstance,
      this.monotonicNumInstalledApps + 1,
      this.createdAt
    );
  }

  public setState(
    appInstanceIdentityHash: string,
    state: SolidityABIEncoderV2Type
  ) {
    const appInstance = this.getAppInstance(appInstanceIdentityHash);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstanceIdentityHash, appInstance.setState(state));

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.twoPartyVirtualEthAsLumpInstances,
      this.freeBalanceAppInstance,
      this.monotonicNumInstalledApps,
      this.createdAt
    );
  }

  public lockAppInstance(appInstanceIdentityHash: string) {
    const appInstance = this.getAppInstance(appInstanceIdentityHash);

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(
      appInstanceIdentityHash,
      appInstance.lockState(NONCE_EXPIRY)
    );

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.twoPartyVirtualEthAsLumpInstances,
      this.freeBalanceAppInstance,
      this.monotonicNumInstalledApps,
      this.createdAt
    );
  }

  public installTwoPartyVirtualEthAsLumpInstances(
    evaaInstance: TwoPartyVirtualEthAsLumpInstance,
    targetIdentityHash: string,
    decrements: { [s: string]: BigNumber }
  ) {
    // Add to twoPartyVirtualEthAsLumpInstances

    const evaaInstances = new Map<string, TwoPartyVirtualEthAsLumpInstance>(
      this.twoPartyVirtualEthAsLumpInstances.entries()
    );

    evaaInstances.set(targetIdentityHash, evaaInstance);

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      this.appInstances,
      evaaInstances,
      this.freeBalanceAppInstance,
      this.monotonicNumInstalledApps + 1,
      this.createdAt
    ).incrementETHFreeBalance(flip(decrements));
  }

  public uninstallTwoPartyVirtualEthAsLumpInstance(
    targetIdentityHash: string,
    increments: { [addr: string]: BigNumber }
  ) {
    const twoPartyVirtualEthAsLumpInstances = new Map<
      string,
      TwoPartyVirtualEthAsLumpInstance
    >(this.twoPartyVirtualEthAsLumpInstances.entries());

    if (!twoPartyVirtualEthAsLumpInstances.delete(targetIdentityHash)) {
      throw Error(
        `cannot find agreement with target hash ${targetIdentityHash}`
      );
    }

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      this.appInstances,
      twoPartyVirtualEthAsLumpInstances,
      this.freeBalanceAppInstance,
      this.monotonicNumInstalledApps,
      this.createdAt
    ).incrementETHFreeBalance(increments);
  }

  public removeVirtualApp(targetIdentityHash: string) {
    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.delete(targetIdentityHash);

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.twoPartyVirtualEthAsLumpInstances,
      this.freeBalanceAppInstance,
      this.monotonicNumInstalledApps,
      this.createdAt
    );
  }

  public installApp(
    appInstance: AppInstance,
    decrements: { [s: string]: BigNumber }
  ) {
    // Verify appInstance has expected signingkeys

    if (appInstance.appSeqNo !== this.monotonicNumInstalledApps) {
      throw Error("AppInstance passed to installApp has incorrect appSeqNo");
    } else {
      const signingKeys = this.getSigningKeysFor(appInstance.appSeqNo);
      if (!signingKeys.every((v, idx) => v === appInstance.signingKeys[idx])) {
        throw Error(
          "AppInstance passed to installApp has incorrect signingKeys"
        );
      }
    }

    /// Add modified FB and new AppInstance to appInstances

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    appInstances.set(appInstance.identityHash, appInstance);

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.twoPartyVirtualEthAsLumpInstances,
      this.freeBalanceAppInstance,
      this.monotonicNumInstalledApps + 1,
      this.createdAt
    ).incrementETHFreeBalance(flip(decrements));
  }

  public uninstallApp(
    appInstanceIdentityHash: string,
    increments: { [s: string]: BigNumber }
  ) {
    const appToBeUninstalled = this.getAppInstance(appInstanceIdentityHash);

    if (appToBeUninstalled.identityHash !== appInstanceIdentityHash) {
      throw Error(
        `Consistency error: app stored under key ${appInstanceIdentityHash} has identityHah ${
          appToBeUninstalled.identityHash
        }`
      );
    }

    const appInstances = new Map<string, AppInstance>(
      this.appInstances.entries()
    );

    if (!appInstances.delete(appToBeUninstalled.identityHash)) {
      throw Error(
        `Consistency error: managed to call get on ${appInstanceIdentityHash} but failed to call delete`
      );
    }

    return new StateChannel(
      this.multisigAddress,
      this.userNeuteredExtendedKeys,
      appInstances,
      this.twoPartyVirtualEthAsLumpInstances,
      this.freeBalanceAppInstance,
      this.monotonicNumInstalledApps,
      this.createdAt
    ).incrementETHFreeBalance(increments);
  }

  public getTwoPartyVirtualEthAsLumpFromTarget(
    target: string
  ): TwoPartyVirtualEthAsLumpInstance {
    for (const [{}, instance] of this.twoPartyVirtualEthAsLumpInstances) {
      if (instance.targetAppIdentityHash === target) {
        return instance;
      }
    }
    throw Error(
      `Could not find any eth virtual app agreements with target ${target}`
    );
  }

  toJson(): StateChannelJSON {
    return {
      multisigAddress: this.multisigAddress,
      userNeuteredExtendedKeys: this.userNeuteredExtendedKeys,
      appInstances: [...this.appInstances.entries()].map(
        (appInstanceEntry): [string, AppInstanceJson] => {
          return [appInstanceEntry[0], appInstanceEntry[1].toJson()];
        }
      ),
      freeBalanceAppInstance: !!this.freeBalanceAppInstance
        ? this.freeBalanceAppInstance.toJson()
        : // Note that this FreeBalance is undefined because a channel technically
          // does not have a FreeBalance before the `setup` protocol gets run
          undefined,
      monotonicNumInstalledApps: this.monotonicNumInstalledApps,
      twoPartyVirtualEthAsLumpInstances: [
        ...this.twoPartyVirtualEthAsLumpInstances.entries()
      ].map(
        (appInstanceEntry): [string, TwoPartyVirtualEthAsLumpInstanceJson] => {
          return [appInstanceEntry[0], appInstanceEntry[1].toJson()];
        }
      ),
      createdAt: this.createdAt
    };
  }

  static fromJson(json: StateChannelJSON): StateChannel {
    return new StateChannel(
      json.multisigAddress,
      json.userNeuteredExtendedKeys,
      new Map(
        [...Object.values(json.appInstances || [])].map(
          (appInstanceEntry): [string, AppInstance] => {
            return [
              appInstanceEntry[0],
              AppInstance.fromJson(appInstanceEntry[1])
            ];
          }
        )
      ),
      new Map(
        [...Object.values(json.twoPartyVirtualEthAsLumpInstances || [])].map(
          (appInstanceEntry): [string, TwoPartyVirtualEthAsLumpInstance] => {
            return [
              appInstanceEntry[0],
              TwoPartyVirtualEthAsLumpInstance.fromJson(appInstanceEntry[1])
            ];
          }
        )
      ),
      json.freeBalanceAppInstance
        ? AppInstance.fromJson(json.freeBalanceAppInstance)
        : undefined,
      json.monotonicNumInstalledApps,
      json.createdAt
    );
  }
}
