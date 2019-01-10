import { AssetType } from "@counterfactual/types";
import { AddressZero, Zero } from "ethers/constants";
import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";

import { AppInstance, StateChannel } from "../../../../src/models";
import { generateRandomNetworkContext } from "@counterfactual/machine/test/mocks";

describe("StateChannel::setState", () => {
  const networkContext = generateRandomNetworkContext();

  let sc1: StateChannel;
  let sc2: StateChannel;
  let testApp: AppInstance;

  beforeAll(() => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const multisigOwners = [
      getAddress(hexlify(randomBytes(20))),
      getAddress(hexlify(randomBytes(20)))
    ];

    testApp = new AppInstance(
      getAddress(hexlify(randomBytes(20))),
      [
        getAddress(hexlify(randomBytes(20))),
        getAddress(hexlify(randomBytes(20)))
      ],
      Math.ceil(Math.random() * 2e10),
      {
        addr: getAddress(hexlify(randomBytes(20))),
        applyAction: hexlify(randomBytes(4)),
        resolve: hexlify(randomBytes(4)),
        isStateTerminal: hexlify(randomBytes(4)),
        getTurnTaker: hexlify(randomBytes(4)),
        stateEncoding: "tuple(address foo, uint256 bar)",
        actionEncoding: undefined
      },
      {
        assetType: AssetType.ETH,
        limit: bigNumberify(Math.ceil(Math.random() * 2e10)),
        token: AddressZero
      },
      false,
      Math.ceil(Math.random() * 2e10),
      0,
      { foo: getAddress(hexlify(randomBytes(20))), bar: 0 },
      Math.ceil(Math.random() * 10000),
      Math.ceil(1000 * Math.random())
    );

    sc1 = new StateChannel(multisigAddress, multisigOwners)
      .setupChannel(networkContext)
      .installApp(testApp, Zero, Zero);

    sc2 = sc1.setState(testApp.identityHash, { foo: AddressZero, bar: 1337 });
  });

  it("should not alter any of the base properties", () => {
    expect(sc2.multisigAddress).toBe(sc1.multisigAddress);
    expect(sc2.multisigOwners).toBe(sc1.multisigOwners);
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
