import { getAddress, hexlify, randomBytes } from "ethers/utils";

import { StateChannel } from "../../../../src/models";

describe("StateChannel", () => {
  it("should be able to instantiate", () => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const multisigOwners = [
      getAddress(hexlify(randomBytes(20))),
      getAddress(hexlify(randomBytes(20)))
    ];

    const sc = new StateChannel(multisigAddress, multisigOwners);

    expect(sc).not.toBe(null);
    expect(sc).not.toBe(undefined);
    expect(sc.multisigAddress).toBe(multisigAddress);
    expect(sc.multisigOwners).toBe(multisigOwners);
    expect(sc.numberOfApps).toBe(0);
    expect(sc.sequenceNumber).toBe(0);
  });
});
