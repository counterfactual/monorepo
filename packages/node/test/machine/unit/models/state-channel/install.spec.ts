import { SolidityABIEncoderV2Type } from "@counterfactual/types";
import { AddressZero, WeiPerEther, Zero } from "ethers/constants";
import { getAddress, hexlify, randomBytes } from "ethers/utils";
import { fromSeed } from "ethers/utils/hdnode";

import { xkeyKthAddress } from "../../../../../src/machine";
import { AppInstance, StateChannel } from "../../../../../src/models";
import {
  convertCoinBucketToMap,
  convertFreeBalanceStateFromPlainObject,
  convertFreeBalanceStateToPlainObject,
  PlainFreeBalanceState
} from "../../../../../src/models/free-balance";
import { createAppInstance } from "../../../../unit/utils";
import { generateRandomNetworkContext } from "../../../mocks";

describe("StateChannel::uninstallApp", () => {
  const networkContext = generateRandomNetworkContext();

  let sc1: StateChannel;
  let sc2: StateChannel;

  let appIdentityHash: string;

  beforeAll(() => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const xpubs = [
      fromSeed(hexlify(randomBytes(32))).neuter().extendedKey,
      fromSeed(hexlify(randomBytes(32))).neuter().extendedKey
    ];

    sc1 = StateChannel.setupChannel(
      networkContext.CoinBucket,
      multisigAddress,
      xpubs
    );

    const appInstance = createAppInstance(sc1);

    appIdentityHash = appInstance.identityHash;

    // Give 1 ETH to Alice and to Bob so they can spend it on the new app
    const ethFreeBalance = {};
    ethFreeBalance[AddressZero] = [
      {
        to: xkeyKthAddress(xpubs[0], 0),
        amount: WeiPerEther
      },
      {
        to: xkeyKthAddress(xpubs[1], 0),
        amount: WeiPerEther
      }
    ];
    sc1 = sc1.setFreeBalance((convertFreeBalanceStateToPlainObject(
      ethFreeBalance
    ) as unknown) as SolidityABIEncoderV2Type);

    sc2 = sc1.installApp(appInstance, {
      [xkeyKthAddress(xpubs[0], 0)]: WeiPerEther,
      [xkeyKthAddress(xpubs[1], 0)]: WeiPerEther
    });
  });

  it("should not alter any of the base properties", () => {
    expect(sc2.multisigAddress).toBe(sc1.multisigAddress);
    expect(sc2.userNeuteredExtendedKeys).toBe(sc1.userNeuteredExtendedKeys);
  });

  it("should have bumped the sequence number", () => {
    expect(sc2.numInstalledApps).toBe(sc1.numInstalledApps + 1);
  });

  it("should have added something at the id of thew new app", () => {
    expect(sc2.getAppInstance(appIdentityHash)).not.toBe(undefined);
  });

  describe("the updated ETH Free Balance", () => {
    let fb: AppInstance;

    beforeAll(() => {
      fb = sc2.freeBalance;
    });

    it("should have updated balances for Alice and Bob", () => {
      const ethFreeBalance = convertCoinBucketToMap(
        convertFreeBalanceStateFromPlainObject(
          (fb.state as unknown) as PlainFreeBalanceState
        )[AddressZero]
      );
      for (const entry of Object.entries(ethFreeBalance)) {
        const balance = entry[1];
        expect(balance).toEqual(Zero);
      }
    });
  });

  describe("the newly installed app", () => {
    let app: AppInstance;

    beforeAll(() => {
      app = sc2.getAppInstance(appIdentityHash)!;
    });

    it("should not be a virtual app", () => {
      expect(app.isVirtualApp).toBe(false);
    });

    // TODO: moar tests pl0x
  });
});
