import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import { AddressZero } from "ethers/constants";
import {
  bigNumberify,
  getAddress,
  hexlify,
  Interface,
  keccak256,
  randomBytes,
  solidityPack,
  TransactionDescription
} from "ethers/utils";

import { SetStateCommitment } from "../../../src/ethereum";
import { appIdentityToHash } from "../../../src/ethereum/utils/app-identity";
import { Transaction } from "../../../src/ethereum/utils/types";
import { AppInstance } from "../../../src/models";

/**
 * This test suite decodes a constructed SetupCommitment transaction object
 * to the specifications defined by Counterfactual as can be found here:
 * https://specs.counterfactual.com/06-update-protocol#commitments
 */
describe("SetupCommitment", () => {
  let commitment: SetStateCommitment;
  let tx: Transaction;

  // Test network context
  const networkContext: NetworkContext = {
    ETHBucket: getAddress(hexlify(randomBytes(20))),
    StateChannelTransaction: getAddress(hexlify(randomBytes(20))),
    MultiSend: getAddress(hexlify(randomBytes(20))),
    NonceRegistry: getAddress(hexlify(randomBytes(20))),
    AppRegistry: getAddress(hexlify(randomBytes(20))),
    ETHBalanceRefund: getAddress(hexlify(randomBytes(20)))
  };

  const app = new AppInstance(
    getAddress(hexlify(randomBytes(20))),
    [
      getAddress(hexlify(randomBytes(20))),
      getAddress(hexlify(randomBytes(20)))
    ],
    Math.ceil(1000 * Math.random()),
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
      limit: bigNumberify(2),
      token: AddressZero
    },
    false,
    Math.ceil(1000 * Math.random()),
    { foo: AddressZero, bar: 0 },
    0,
    Math.ceil(1000 * Math.random())
  );

  beforeAll(() => {
    commitment = new SetStateCommitment(
      networkContext,
      app.identity,
      app.encodedLatestState,
      app.latestNonce,
      app.latestTimeout
    );
    // TODO: (question) Should there be a way to retrieve the version
    //       of this transaction sent to the multisig vs sent
    //       directly to the app registry?
    tx = commitment.transaction([
      /* NOTE: Passing in no signatures for test only */
    ]);
  });

  it("should be to AppRegistry", () => {
    expect(tx.to).toBe(networkContext.AppRegistry);
  });

  it("should have no value", () => {
    expect(tx.value).toBe(0);
  });

  describe("the calldata", () => {
    const iface = new Interface(AppRegistry.abi);
    let desc: TransactionDescription;

    beforeAll(() => {
      const { data } = tx;
      desc = iface.parseTransaction({ data });
    });

    it("should be to the setState method", () => {
      expect(desc.sighash).toBe(iface.functions.setState.sighash);
    });

    it("should contain expected AppIdentity argument", () => {
      const [
        owner,
        signingKeys,
        appInterfaceHash,
        termsHash,
        defaultTimeout
      ] = desc.args[0];
      expect(owner).toBe(app.identity.owner);
      expect(signingKeys).toEqual(app.identity.signingKeys);
      expect(appInterfaceHash).toBe(app.identity.appInterfaceHash);
      expect(termsHash).toBe(app.identity.termsHash);
      expect(defaultTimeout).toEqual(bigNumberify(app.identity.defaultTimeout));
    });

    it("should contain expected SignedStateHashUpdate argument", () => {
      const [stateHash, nonce, timeout, []] = desc.args[1];
      expect(stateHash).toBe(app.hashOfLatestState);
      expect(nonce).toEqual(bigNumberify(app.latestNonce));
      expect(timeout).toEqual(bigNumberify(app.latestTimeout));
    });
  });

  it("should produce the correct hash to sign", () => {
    const hashToSign = commitment.hashToSign();

    // Based on MAppRegistryCore::computeStateHash
    // TODO: Probably should be able to compute this from some helper
    //       function ... maybe an AppRegistry class or something
    const expectedHashToSign = keccak256(
      solidityPack(
        ["bytes1", "bytes32", "uint256", "uint256", "bytes32"],
        [
          "0x19",
          appIdentityToHash(app.identity),
          app.latestNonce,
          app.latestTimeout,
          app.hashOfLatestState
        ]
      )
    );

    expect(hashToSign).toBe(expectedHashToSign);
  });
});
