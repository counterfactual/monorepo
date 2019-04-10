import { AssetType } from "@counterfactual/types";
import { AddressZero, Zero } from "ethers/constants";
import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";
import { fromSeed } from "ethers/utils/hdnode";

import { AppInstance, StateChannel } from "../../../../../src/machine/models";
import { xkeyKthAddress } from "../../../../../src/machine/xkeys";
import { generateRandomNetworkContext } from "../../../mocks";

const APP_STATE = {
  foo: AddressZero,
  bar: 42
};

describe("StateChannel::setState", () => {
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

    testApp = new AppInstance(
      getAddress(hexlify(randomBytes(20))),
      [
        xkeyKthAddress(userNeuteredExtendedKeys[0], sc1.numInstalledApps),
        xkeyKthAddress(userNeuteredExtendedKeys[1], sc1.numInstalledApps)
      ].sort((a, b) => (parseInt(a, 16) < parseInt(b, 16) ? -1 : 1)),
      Math.ceil(Math.random() * 2e10),
      {
        addr: getAddress(hexlify(randomBytes(20))),
        stateEncoding: "tuple(address foo, uint256 bar)",
        actionEncoding: undefined
      },
      {
        assetType: AssetType.ETH,
        limit: bigNumberify(Math.ceil(Math.random() * 2e10)),
        token: AddressZero
      },
      false,
      sc1.numInstalledApps,
      0,
      { foo: getAddress(hexlify(randomBytes(20))), bar: 0 },
      Math.ceil(Math.random() * 10000),
      Math.ceil(1000 * Math.random())
    );

    sc1 = sc1.installApp(testApp, Zero, Zero);

    sc2 = sc1.setState(testApp.identityHash, APP_STATE);
  });

  it("should not alter any of the base properties", () => {
    expect(sc2.multisigAddress).toBe(sc1.multisigAddress);
    expect(sc2.userNeuteredExtendedKeys).toBe(sc1.userNeuteredExtendedKeys);
  });

  it("should not have bumped the sequence number", () => {
    expect(sc2.numInstalledApps).toBe(sc1.numInstalledApps);
  });

  describe("the updated app", () => {
    let app: AppInstance;

    beforeAll(() => {
      app = sc2.getAppInstance(testApp.identityHash)!;
    });

    it("should have the new state", () => {
      expect(app.state).toEqual(APP_STATE);
    });

    it("should have bumped the nonce", () => {
      expect(app.nonce).toBe(testApp.nonce + 1);
    });

    it("should have used the default timeout", () => {
      expect(app.timeout).toBe(app.timeout);
    });
  });
});
