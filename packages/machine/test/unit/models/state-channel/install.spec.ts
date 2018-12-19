import { AssetType, ETHBucketAppState } from "@counterfactual/types";
import { AddressZero, WeiPerEther, Zero } from "ethers/constants";
import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";

import { AppInstance, StateChannel } from "../../../../src/models";

describe("StateChannel::uninstallApp", () => {
  const networkContext = {
    ETHBucket: getAddress(hexlify(randomBytes(20))),
    StateChannelTransaction: getAddress(hexlify(randomBytes(20))),
    MultiSend: getAddress(hexlify(randomBytes(20))),
    NonceRegistry: getAddress(hexlify(randomBytes(20))),
    AppRegistry: getAddress(hexlify(randomBytes(20))),
    ETHBalanceRefund: getAddress(hexlify(randomBytes(20)))
  };

  let sc1: StateChannel;
  let sc2: StateChannel;

  let appInstanceId: string;

  beforeAll(() => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const multisigOwners = [
      getAddress(hexlify(randomBytes(20))),
      getAddress(hexlify(randomBytes(20)))
    ];

    sc1 = new StateChannel(multisigAddress, multisigOwners).setupChannel(
      networkContext
    );

    const app = new AppInstance(
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
      { foo: getAddress(hexlify(randomBytes(20))), bar: 0 },
      999, // <------ nonce
      Math.ceil(1000 * Math.random())
    );

    appInstanceId = app.id;

    // Give 1 ETH to Alice and to Bob so they can spend it on the new app
    const fb = sc1.getFreeBalanceFor(AssetType.ETH);

    sc1 = sc1.setState(fb.id, {
      ...fb.state,
      aliceBalance: WeiPerEther,
      bobBalance: WeiPerEther
    });

    sc2 = sc1.installApp(app, WeiPerEther, WeiPerEther);
  });

  it("should not alter any of the base properties", () => {
    expect(sc2.multisigAddress).toBe(sc1.multisigAddress);
    expect(sc2.multisigOwners).toBe(sc1.multisigOwners);
  });

  it("should have bumped the sequence number", () => {
    expect(sc2.numInstalledApps).toBe(sc1.numInstalledApps + 1);
  });

  it("should have added something at the id of thew new app", () => {
    expect(sc2.getAppInstance(appInstanceId)).not.toBe(undefined);
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

  describe("the newly installed app", () => {
    let app: AppInstance;

    beforeAll(() => {
      app = sc2.getAppInstance(appInstanceId)!;
    });

    it("should not be a metachannel app", () => {
      expect(app.isMetachannelApp).toBe(false);
    });

    // TODO: moar tests pl0x
  });
});
