import { getAddress, hexlify, randomBytes } from "ethers/utils";
import { fromSeed } from "ethers/utils/hdnode";

import { StateChannel } from "../../../../../src/machine/models";

describe("StateChannel", () => {
  it("should be able to instantiate", () => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const userNeuteredExtendedKeys = [
      fromSeed(hexlify(randomBytes(32))).neuter().extendedKey,
      fromSeed(hexlify(randomBytes(32))).neuter().extendedKey
    ];

    const sc = new StateChannel(multisigAddress, userNeuteredExtendedKeys);

    expect(sc).not.toBe(null);
    expect(sc).not.toBe(undefined);
    expect(sc.multisigAddress).toBe(multisigAddress);
    expect(sc.userNeuteredExtendedKeys).toBe(userNeuteredExtendedKeys);
    expect(sc.numActiveApps).toBe(0);
    expect(sc.numInstalledApps).toBe(0);
  });
});
