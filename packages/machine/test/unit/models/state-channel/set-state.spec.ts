import { AssetType } from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import { bigNumberify, getAddress, hexlify, randomBytes } from "ethers/utils";

import { AppInstance, StateChannel } from "../../../../src/models";

describe("StateChannel::setState", () => {
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

    sc2 = sc1.setState("test-identifier", { foo: AddressZero, bar: 1337 });
  });

  it("should not alter any of the base properties", () => {
    expect(sc2.multisigAddress).toBe(sc1.multisigAddress);
    expect(sc2.multisigOwners).toBe(sc1.multisigOwners);
  });

  it("should not have bumped the sequence number", () => {
    expect(sc2.sequenceNumber).toBe(sc1.sequenceNumber);
  });

  describe("the updated app", () => {
    let app: AppInstance;

    beforeAll(() => {
      app = sc2.apps.get("test-identifier")!;
    });

    it("should have the new state", () => {
      expect(app.state).toEqual({
        foo: AddressZero,
        bar: 1337
      });
    });

    it("should have bumped the nonce", () => {
      // TODO: make 999 a const var in the test
      expect(app.nonce).toBe(999 + 1);
    });

    it("should have used the default timeout", () => {
      expect(app.timeout).toBe(app.timeout);
    });
  });
});
