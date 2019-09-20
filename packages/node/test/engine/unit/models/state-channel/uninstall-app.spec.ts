import { Zero } from "ethers/constants";
import { getAddress, hexlify, randomBytes } from "ethers/utils";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../../../src/constants";
import { xkeyKthAddress } from "../../../../../src/engine";
import { AppInstance, StateChannel } from "../../../../../src/models";
import { FreeBalanceClass } from "../../../../../src/models/free-balance";
import { createAppInstanceForTest } from "../../../../unit/utils";
import { getRandomExtendedPubKeys } from "../../../integration/random-signing-keys";
import { generateRandomNetworkContext } from "../../../mocks";

describe("StateChannel::uninstallApp", () => {
  const networkContext = generateRandomNetworkContext();

  let sc1: StateChannel;
  let sc2: StateChannel;
  let testApp: AppInstance;

  beforeAll(() => {
    const multisigAddress = getAddress(hexlify(randomBytes(20)));
    const xpubs = getRandomExtendedPubKeys(2);

    sc1 = StateChannel.setupChannel(
      networkContext.IdentityApp,
      multisigAddress,
      xpubs
    );

    testApp = createAppInstanceForTest(sc1);

    sc1 = sc1.installApp(testApp, {
      [CONVENTION_FOR_ETH_TOKEN_ADDRESS]: {
        [xkeyKthAddress(xpubs[0], 0)]: Zero,
        [xkeyKthAddress(xpubs[1], 0)]: Zero
      }
    });

    sc2 = sc1.uninstallApp(testApp.identityHash, {
      [CONVENTION_FOR_ETH_TOKEN_ADDRESS]: {
        [xkeyKthAddress(xpubs[0], 0)]: Zero,
        [xkeyKthAddress(xpubs[1], 0)]: Zero
      }
    });
  });

  it("should not alter any of the base properties", () => {
    expect(sc2.multisigAddress).toBe(sc1.multisigAddress);
    expect(sc2.userNeuteredExtendedKeys).toBe(sc1.userNeuteredExtendedKeys);
  });

  it("should not have changed the sequence number", () => {
    expect(sc2.numProposedApps).toBe(sc1.numProposedApps);
  });

  it("should have decreased the active apps number", () => {
    expect(sc2.numActiveApps).toBe(sc1.numActiveApps - 1);
  });

  it("should have deleted the app being uninstalled", () => {
    expect(sc2.isAppInstanceInstalled(testApp.identityHash)).toBe(false);
  });

  describe("the updated ETH Free Balance", () => {
    let fb: FreeBalanceClass;

    beforeAll(() => {
      fb = sc2.getFreeBalanceClass();
    });

    it("should have updated balances for Alice and Bob", () => {
      for (const amount of Object.values(
        fb.withTokenAddress(CONVENTION_FOR_ETH_TOKEN_ADDRESS) || {}
      )) {
        expect(amount).toEqual(Zero);
      }
    });
  });
});
