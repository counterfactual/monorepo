import { generateRandomNetworkContext } from "@counterfactual/machine/test/mocks";
import { AssetType } from "@counterfactual/types";
import { AddressZero, Zero } from "ethers/constants";
import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";
import { fromSeed } from "ethers/utils/hdnode";

import { AppInstance, StateChannel } from "../../../../src/models";
import { xpubKthAddress } from "../../../../src/xpub";

describe("StateChannel::setState", () => {
  const networkContext = generateRandomNetworkContext();

  let sc1: StateChannel;
  let sc2: StateChannel;
  let testApp: AppInstance;

  beforeAll(() => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const userExtendedPublicKeys = [
      fromSeed(hexlify(randomBytes(32))).extendedKey,
      fromSeed(hexlify(randomBytes(32))).extendedKey
    ];

    sc1 = StateChannel.setupChannel(
      networkContext.ETHBucket,
      multisigAddress,
      userExtendedPublicKeys
    );

    testApp = new AppInstance(
      getAddress(hexlify(randomBytes(20))),
      [
        xpubKthAddress(userExtendedPublicKeys[0], sc1.numInstalledApps),
        xpubKthAddress(userExtendedPublicKeys[1], sc1.numInstalledApps)
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

    sc2 = sc1.setState(testApp.identityHash, { foo: AddressZero, bar: 1337 });
  });

  it("should not alter any of the base properties", () => {
    expect(sc2.multisigAddress).toBe(sc1.multisigAddress);
    expect(sc2.userExtendedPublicKeys).toBe(sc1.userExtendedPublicKeys);
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
      expect(app.state).toEqual({
        foo: AddressZero,
        bar: 1337
      });
    });

    it("should have bumped the nonce", () => {
      expect(app.nonce).toBe(testApp.nonce + 1);
    });

    it("should have used the default timeout", () => {
      expect(app.timeout).toBe(app.timeout);
    });
  });
});
