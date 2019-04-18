import StateChannelTransaction from "@counterfactual/contracts/build/StateChannelTransaction.json";
import { AssetType } from "@counterfactual/types";
import {
  bigNumberify,
  getAddress,
  hexlify,
  Interface,
  randomBytes,
  TransactionDescription
} from "ethers/utils";
import { fromSeed } from "ethers/utils/hdnode";

import { SetupCommitment } from "../../../../src/machine/ethereum";
import { MultisigTransaction } from "../../../../src/machine/ethereum/types";
import { appIdentityToHash } from "../../../../src/machine/ethereum/utils/app-identity";
import { StateChannel } from "../../../../src/machine/models";
import { generateRandomNetworkContext } from "../../mocks";

/**
 * This test suite decodes a constructed SetupCommitment transaction object according
 * to the specifications defined by Counterfactual as can be found here:
 * https://specs.counterfactual.com/04-setup-protocol#commitments
 *
 * TODO: This test suite _only_ covers the conditional transaction from the specs
 *       above. This is because the root nonce setNonce transaction has not been
 *       implemented in OpSetuptup yet.
 */
describe("SetupCommitment", () => {
  let tx: MultisigTransaction;

  // Dummy network context
  const networkContext = generateRandomNetworkContext();

  // General interaction testing values
  const interaction = {
    sender: fromSeed(hexlify(randomBytes(32))).neuter().extendedKey,
    receiver: fromSeed(hexlify(randomBytes(32))).neuter().extendedKey
  };

  // State channel testing values
  const stateChannel = StateChannel.setupChannel(
    networkContext.ETHBucket,
    getAddress(hexlify(randomBytes(20))),
    [interaction.sender, interaction.receiver]
  );

  const freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

  beforeAll(() => {
    tx = new SetupCommitment(
      networkContext,
      stateChannel.multisigAddress,
      stateChannel.multisigOwners,
      freeBalanceETH.identity,
      freeBalanceETH.terms
    ).getTransactionDetails();
  });

  it("should be to StateChannelTransaction", () => {
    expect(tx.to).toBe(networkContext.StateChannelTransaction);
  });

  it("should have no value", () => {
    expect(tx.value).toBe(0);
  });

  describe("the calldata", () => {
    const iface = new Interface(StateChannelTransaction.abi);
    let desc: TransactionDescription;

    beforeAll(() => {
      const { data } = tx;
      desc = iface.parseTransaction({ data });
    });

    it("should be to the executeAppConditionalTransaction method", () => {
      expect(desc.sighash).toBe(
        iface.functions.executeAppConditionalTransaction.sighash
      );
    });

    it("should contain expected arguments", () => {
      const [
        appRegistry,
        nonceRegistry,
        uninstallKey,
        rootNonceValue,
        appIdentityHash,
        [assetType, limit, token]
      ] = desc.args;
      expect(appRegistry).toBe(networkContext.AppRegistry);
      expect(nonceRegistry).toEqual(networkContext.NonceRegistry);
      expect(uninstallKey).toBe(freeBalanceETH.uninstallKey);
      expect(rootNonceValue).toEqual(
        bigNumberify(freeBalanceETH.rootNonceValue)
      );
      expect(appIdentityHash).toBe(appIdentityToHash(freeBalanceETH.identity));
      expect(assetType).toBe(freeBalanceETH.terms.assetType);
      expect(limit).toEqual(freeBalanceETH.terms.limit);
      expect(token).toBe(freeBalanceETH.terms.token);
    });
  });
});
