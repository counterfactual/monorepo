import StateChannelTransaction from "@counterfactual/contracts/build/contracts/StateChannelTransaction.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import {
  getAddress,
  hexlify,
  Interface,
  randomBytes,
  TransactionDescription
} from "ethers/utils";

import { SetupCommitment } from "../../../src/middleware/protocol-operation";
import { appIdentityToHash } from "../../../src/middleware/protocol-operation/utils/app-identity";
import { MultisigTransaction } from "../../../src/middleware/protocol-operation/types";
import { StateChannel } from "../../../src/models";

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

  // Test network context
  const networkContext: NetworkContext = {
    ETHBucket: getAddress(hexlify(randomBytes(20))),
    StateChannelTransaction: getAddress(hexlify(randomBytes(20))),
    MultiSend: getAddress(hexlify(randomBytes(20))),
    NonceRegistry: getAddress(hexlify(randomBytes(20))),
    AppRegistry: getAddress(hexlify(randomBytes(20))),
    ETHBalanceRefund: getAddress(hexlify(randomBytes(20)))
  };

  // General interaction testing values
  const interaction = {
    sender: getAddress(hexlify(randomBytes(20))),
    receiver: getAddress(hexlify(randomBytes(20)))
  };

  // State channel testing values
  const stateChannel = new StateChannel(
    getAddress(hexlify(randomBytes(20))),
    [interaction.sender, interaction.receiver].sort((a, b) =>
      parseInt(a, 16) < parseInt(b, 16) ? -1 : 1
    )
  ).setupChannel(networkContext);

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
        appCfAddress, // FIXME: Rename this field on the contract
        [assetType, limit, token]
      ] = desc.args;
      expect(appRegistry).toBe(networkContext.AppRegistry);
      expect(nonceRegistry).toEqual(networkContext.NonceRegistry);
      expect(uninstallKey).toBe(freeBalanceETH.uninstallKey);
      expect(appCfAddress).toBe(appIdentityToHash(freeBalanceETH.identity));
      expect(assetType).toBe(freeBalanceETH.terms.assetType);
      expect(limit).toEqual(freeBalanceETH.terms.limit);
      expect(token).toBe(freeBalanceETH.terms.token);
    });
  });
});
