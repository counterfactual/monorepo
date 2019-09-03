import { getAddress, hexlify, randomBytes } from "ethers/utils";

import { StateChannel } from "../../../../../src/models";
import { getRandomExtendedPubKeys } from "../../../integration/random-signing-keys";

describe("StateChannel", () => {
  it("should be able to instantiate", () => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const xpubs = getRandomExtendedPubKeys(2);

    const sc = new StateChannel(multisigAddress, xpubs);

    expect(sc).not.toBe(null);
    expect(sc).not.toBe(undefined);
    expect(sc.multisigAddress).toBe(multisigAddress);
    expect(sc.userNeuteredExtendedKeys).toBe(xpubs);
    expect(sc.numActiveApps).toBe(0);
    expect(sc.numProposedApps).toBe(0);
  });
});
