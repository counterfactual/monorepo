import { OutcomeType } from "@counterfactual/types";
import { AddressZero, Zero } from "ethers/constants";
import { getAddress, hexlify, randomBytes } from "ethers/utils";

import { AppInstance } from "../../../../../src/models";

describe("AppInstance", () => {
  it("should be able to instantiate", () => {
    const participants = [
      getAddress(hexlify(randomBytes(20))),
      getAddress(hexlify(randomBytes(20)))
    ];

    const appInstance = new AppInstance(
      participants,
      Math.ceil(Math.random() * 2e10),
      {
        addr: getAddress(hexlify(randomBytes(20))),
        stateEncoding: "tuple(address foo, uint256 bar)",
        actionEncoding: undefined
      },
      false,
      Math.ceil(Math.random() * 2e10),
      { foo: getAddress(hexlify(randomBytes(20))), bar: 0 },
      /* versionNumber */ 999,
      Math.ceil(1000 * Math.random()),
      OutcomeType.TWO_PARTY_FIXED_OUTCOME,
      {
        playerAddrs: [AddressZero, AddressZero],
        amount: Zero,
        tokenAddress: AddressZero
      },
      undefined,
      undefined
    );

    expect(appInstance).not.toBe(null);
    expect(appInstance).not.toBe(undefined);
    expect(appInstance.participants).toBe(participants);

    // TODO: moar tests pl0x
  });
});
