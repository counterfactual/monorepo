import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import { AppIdentity, AppInterface, Terms } from "@counterfactual/types";
import { ethers } from "ethers";
import { solidityPack } from "ethers/utils";

import { APP_INTERFACE, TERMS } from "../../../src/encodings";
import { OpSetState } from "../../../src/middleware/protocol-operation";
import { Transaction } from "../../../src/middleware/protocol-operation/types";
import { appIdentityToHash } from "../../../src/utils";

const {
  keccak256,
  defaultAbiCoder,
  SigningKey,
  getAddress,
  hexlify,
  randomBytes,
  bigNumberify,
  Interface
} = ethers.utils;
const { AddressZero } = ethers.constants;

/**
 * This test suite decodes a constructed OpSetState transaction object according
 * to the specifications defined by Counterfactual as can be found here:
 * https://specs.counterfactual.com/06-update-protocol#commitments
 */
describe("OpSetState", () => {
  let operation: OpSetState;
  let generatedTx: Transaction;

  // Test network context
  const networkContext = {
    ETHBucket: getAddress(hexlify(randomBytes(20))),
    StateChannelTransaction: getAddress(hexlify(randomBytes(20))),
    MultiSend: getAddress(hexlify(randomBytes(20))),
    NonceRegistry: getAddress(hexlify(randomBytes(20))),
    AppRegistry: getAddress(hexlify(randomBytes(20))),
    PaymentApp: getAddress(hexlify(randomBytes(20))),
    ETHBalanceRefund: getAddress(hexlify(randomBytes(20)))
  };

  // Test app-values
  const app = {
    owner: getAddress(hexlify(randomBytes(20))),

    signingKeys: [
      // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
      new SigningKey(
        "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
      ),
      // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
      new SigningKey(
        "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
      )
    ],

    interface: {
      addr: getAddress(hexlify(randomBytes(20))),
      getTurnTaker: hexlify(randomBytes(4)),
      resolve: hexlify(randomBytes(4)),
      applyAction: hexlify(randomBytes(4)),
      isStateTerminal: hexlify(randomBytes(4))
    } as AppInterface,

    terms: {
      assetType: 0,
      limit: bigNumberify(10),
      token: AddressZero
    } as Terms,

    defaultTimeout: 100,

    identity: {} as AppIdentity,

    stateUpdate: {
      hash: hexlify(randomBytes(32)),
      nonce: 888,
      timeout: 999
    }
  };

  app.identity = {
    defaultTimeout: app.defaultTimeout,
    owner: app.owner,
    signingKeys: app.signingKeys.map(x => x.address),
    appInterfaceHash: keccak256(
      defaultAbiCoder.encode([APP_INTERFACE], [app.interface])
    ),
    termsHash: keccak256(defaultAbiCoder.encode([TERMS], [app.terms]))
  };

  beforeAll(() => {
    operation = new OpSetState(
      networkContext,
      app.identity,
      app.stateUpdate.hash,
      app.stateUpdate.nonce,
      app.stateUpdate.timeout
    );
    generatedTx = operation.transaction([
      app.signingKeys[0].signDigest(operation.hashToSign()),
      app.signingKeys[1].signDigest(operation.hashToSign())
    ]);
  });

  it("should be to AppRegistry", () => {
    expect(generatedTx.to).toBe(networkContext.AppRegistry);
  });

  it("should have no value", () => {
    expect(generatedTx.value).toBe(0);
  });

  describe("the calldata", () => {
    const iface = new Interface(AppRegistry.abi);
    let desc: ethers.utils.TransactionDescription;

    beforeAll(() => {
      const { data } = generatedTx;
      desc = iface.parseTransaction({ data });
    });

    it("should be to the setState method", () => {
      expect(desc.name).toBe(iface.functions.setState.signature);
    });

    it("should contain expected AppIdentity argument", () => {
      const [
        owner,
        signingKeys,
        appInterfaceHash,
        termsHash,
        defaultTimeout
      ] = desc.args[0];

      const expected = app.identity;

      expect(owner).toBe(expected.owner);
      expect(signingKeys).toEqual(expected.signingKeys);
      expect(appInterfaceHash).toBe(expected.appInterfaceHash);
      expect(termsHash).toBe(expected.termsHash);
      expect(defaultTimeout).toEqual(bigNumberify(expected.defaultTimeout));
    });

    it("should contain expected SignedStateHashUpdate argument", () => {
      const [stateHash, nonce, timeout, []] = desc.args[1];

      const expected = app.stateUpdate;

      expect(stateHash).toBe(expected.hash);
      expect(nonce).toEqual(bigNumberify(expected.nonce));
      expect(timeout).toEqual(bigNumberify(expected.timeout));
    });
  });

  it("should produce the correct hash to sign", () => {
    const hashToSign = operation.hashToSign();

    // Based on MAppRegistryCore::computeStateHash
    const expectedHashToSign = keccak256(
      solidityPack(
        ["bytes1", "bytes32", "uint256", "uint256", "bytes32"],
        [
          "0x19",
          appIdentityToHash(app.identity),
          app.stateUpdate.nonce,
          app.stateUpdate.timeout,
          app.stateUpdate.hash
        ]
      )
    );

    expect(hashToSign).toBe(expectedHashToSign);
  });
});
