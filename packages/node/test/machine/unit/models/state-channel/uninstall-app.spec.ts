import { AssetType, ETHBucketAppState } from "@counterfactual/types";
import { Zero } from "ethers/constants";
import { getAddress, hexlify, randomBytes } from "ethers/utils";
import { fromSeed } from "ethers/utils/hdnode";

import { AppInstance, StateChannel } from "../../../../../src/models";
import { createAppInstance } from "../../../../unit/utils";
import { generateRandomNetworkContext } from "../../../mocks";

describe("StateChannel::uninstallApp", () => {
  const networkContext = generateRandomNetworkContext();

  let sc1: StateChannel;
  let sc2: StateChannel;
  let testApp: AppInstance;

  beforeAll(() => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const userNeuteredExtendedKeys = [
      fromSeed(hexlify(randomBytes(32))).neuter().extendedKey,
      fromSeed(hexlify(randomBytes(32))).neuter().extendedKey
    ];

    sc1 = StateChannel.setupChannel(
      networkContext.ETHBucket,
      multisigAddress,
      userNeuteredExtendedKeys
    );

    testApp = createAppInstance(sc1);

    sc1 = sc1.installApp(testApp, Zero, Zero);

    sc2 = sc1.uninstallApp(testApp.identityHash, Zero, Zero);
  });

  it("should not alter any of the base properties", () => {
    expect(sc2.multisigAddress).toBe(sc1.multisigAddress);
    expect(sc2.userNeuteredExtendedKeys).toBe(sc1.userNeuteredExtendedKeys);
  });

  it("should not have changed the sequence number", () => {
    expect(sc2.numInstalledApps).toBe(sc1.numInstalledApps);
  });

  it("should have decreased the active apps number", () => {
    expect(sc2.numActiveApps).toBe(sc1.numActiveApps - 1);
  });

  it("should have deleted the app being uninstalled", () => {
    expect(sc2.isAppInstanceInstalled(testApp.identityHash)).toBe(false);
  });

  describe("the updated ETH Free Balance", () => {
    let fb: AppInstance;

    beforeAll(() => {
      fb = sc2.getFreeBalanceFor(AssetType.ETH);
    });

    it("should have updated balances for Alice and Bob", () => {
      const { aliceBalance, bobBalance } = fb.state as ETHBucketAppState;
      expect(aliceBalance).toEqual(Zero);
      expect(bobBalance).toEqual(Zero);
    });
  });
});
