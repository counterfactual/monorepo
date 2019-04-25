import AppRegistry from "@counterfactual/contracts/build/AppRegistry.json";
import {
  bigNumberify,
  Interface,
  keccak256,
  solidityPack,
  TransactionDescription
} from "ethers/utils";

import { SetStateCommitment } from "../../../../src/ethereum";
import { Transaction } from "../../../../src/ethereum/types";
import { appIdentityToHash } from "../../../../src/ethereum/utils/app-identity";
import { createAppInstance } from "../../../unit/utils";
import { generateRandomNetworkContext } from "../../mocks";

/**
 * This test suite decodes a constructed SetState Commitment transaction object
 * to the specifications defined by Counterfactual as can be found here:
 * https://specs.counterfactual.com/06-update-protocol#commitments
 */
describe("Set State Commitment", () => {
  let commitment: SetStateCommitment;
  let tx: Transaction;

  const networkContext = generateRandomNetworkContext();

  const appInstance = createAppInstance();

  beforeAll(() => {
    commitment = new SetStateCommitment(
      networkContext,
      appInstance.identity,
      appInstance.hashOfLatestState,
      appInstance.nonce,
      appInstance.timeout
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
    const hashToSign = commitment.hashToSign();

    // Based on MAppRegistryCore::computeStateHash
    // TODO: Probably should be able to compute this from some helper
    //       function ... maybe an AppRegistry class or something
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
