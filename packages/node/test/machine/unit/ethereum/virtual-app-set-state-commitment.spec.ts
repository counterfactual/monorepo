import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import { AssetType } from "@counterfactual/types";
import { AddressZero, HashZero } from "ethers/constants";
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

import { VirtualAppSetStateCommitment } from "../../../../src/machine/ethereum";
import { Transaction } from "../../../../src/machine/ethereum/types";
import { appIdentityToHash } from "../../../../src/machine/ethereum/utils/app-identity";
import { AppInstance } from "../../../../src/machine/models";
import { generateRandomNetworkContext } from "../../mocks";

/**
 * This test suite decodes a constructed VirtualAppSetStateCommitment
 * transaction object defined here
 * https://specs.counterfactual.com/09-install-virtual-app-protocol#targetvirtualappsetstate
 */
describe("Virtual App Set State Commitment", () => {
  let commitment: VirtualAppSetStateCommitment;
  let tx: Transaction;

  const networkContext = generateRandomNetworkContext();

  const appInstance = new AppInstance(
    getAddress(hexlify(randomBytes(20))),
    [
      getAddress(hexlify(randomBytes(20))),
      getAddress(hexlify(randomBytes(20)))
    ],
    Math.ceil(1000 * Math.random()),
    {
      addr: getAddress(hexlify(randomBytes(20))),
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
    0,
    { foo: AddressZero, bar: 0 },
    0,
    Math.ceil(1000 * Math.random())
  );

  beforeAll(() => {
    commitment = new VirtualAppSetStateCommitment(
      networkContext,
      appInstance.identity,
      appInstance.timeout,
      appInstance.hashOfLatestState,
      appInstance.nonce
    );
    tx = commitment.transaction([], {
      r: HashZero,
      s: HashZero,
      v: 0
    });
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

    it("should be to the virtualAppSetState method", () => {
      expect(desc.sighash).toBe(iface.functions.virtualAppSetState.sighash);
    });

    it("should contain expected AppIdentity argument", () => {
      const [
        owner,
        signingKeys,
        appDefinitionAddress,
        termsHash,
        defaultTimeout
      ] = desc.args[0];
      expect(owner).toBe(appInstance.identity.owner);
      expect(signingKeys).toEqual(appInstance.identity.signingKeys);
      expect(appDefinitionAddress).toBe(
        appInstance.identity.appDefinitionAddress
      );
      expect(termsHash).toBe(appInstance.identity.termsHash);
      expect(defaultTimeout).toEqual(
        bigNumberify(appInstance.identity.defaultTimeout)
      );
    });

    it("should contain expected SignedStateHashUpdate argument", () => {
      const [stateHash, nonce, timeout, []] = desc.args[1];
      expect(stateHash).toBe(appInstance.hashOfLatestState);
      expect(nonce).toEqual(bigNumberify(appInstance.nonce));
      expect(timeout).toEqual(bigNumberify(appInstance.timeout));
    });
  });

  it("should produce the correct hash to sign", () => {
    const hashToSign = commitment.hashToSign(false);

    // Based on MAppRegistryCore::computeStateHash
    const expectedHashToSign = keccak256(
      solidityPack(
        ["bytes1", "bytes32", "uint256", "uint256", "bytes32"],
        [
          "0x19",
          appIdentityToHash(appInstance.identity),
          appInstance.nonce,
          appInstance.timeout,
          appInstance.hashOfLatestState
        ]
      )
    );

    expect(hashToSign).toBe(expectedHashToSign);
  });
});
