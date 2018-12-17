import { AssetType, ETHBucketAppState } from "@counterfactual/types";
import { AddressZero, WeiPerEther } from "ethers/constants";
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

  beforeAll(() => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const multisigOwners = [
      getAddress(hexlify(randomBytes(20))),
      getAddress(hexlify(randomBytes(20)))
    ];

    sc1 = new StateChannel(
      multisigAddress,
      multisigOwners,
      new Map<string, AppInstance>(),
      new Map<AssetType, string>()
    );

    sc1.setupChannel(networkContext);

    sc1.apps.set(
      "test-identifier",
      new AppInstance(
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
      )
    );

    sc2 = sc1.uninstallApp("test-identifier", WeiPerEther, WeiPerEther);
  });

  it("should not alter any of the base properties", () => {
    expect(sc2.multisigAddress).toBe(sc1.multisigAddress);
    expect(sc2.multisigOwners).toBe(sc1.multisigOwners);
  });

  it("should not have bumped the sequence number", () => {
    expect(sc2.sequenceNumber).toBe(sc1.sequenceNumber);
  });

  it("should have deleted the app being uninstalled", () => {
    expect(sc2.apps.get("test-identifier")).toBe(undefined);
  });

  describe("the updated ETH Free Balance", () => {
    let fb: AppInstance;

    beforeAll(() => {
      fb = sc2.getFreeBalanceFor(AssetType.ETH);
    });

    it("should have updated balances for Alice and Bob", () => {
      const { aliceBalance, bobBalance } = fb.state as ETHBucketAppState;
      expect(aliceBalance).toEqual(WeiPerEther);
      expect(bobBalance).toEqual(WeiPerEther);
    });
  });
});
