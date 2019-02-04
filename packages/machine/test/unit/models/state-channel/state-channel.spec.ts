import { getAddress, hexlify, randomBytes } from "ethers/utils";

import { StateChannel } from "../../../../src/models";

describe("StateChannel", () => {
  it("should be able to instantiate", () => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const userExtendedPublicKeys = [
      hexlify(randomBytes(32)),
      hexlify(randomBytes(32))
    ];

    const sc = new StateChannel(multisigAddress, userExtendedPublicKeys);

    expect(sc).not.toBe(null);
    expect(sc).not.toBe(undefined);
    expect(sc.multisigAddress).toBe(multisigAddress);
    expect(sc.userExtendedPublicKeys).toBe(userExtendedPublicKeys);
    expect(sc.numActiveApps).toBe(0);
    expect(sc.numInstalledApps).toBe(0);
  });
});
