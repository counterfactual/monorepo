import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import MultiSend from "@counterfactual/contracts/build/contracts/MultiSend.json";
import StateChannelTransaction from "@counterfactual/contracts/build/contracts/StateChannelTransaction.json";
import { AssetType, NetworkContext } from "@counterfactual/types";
import { AddressZero, HashZero, WeiPerEther, Zero } from "ethers/constants";
import {
  bigNumberify,
  getAddress,
  hexlify,
  Interface,
  randomBytes,
  TransactionDescription
} from "ethers/utils";

import { InstallCommitment } from "../../../src/ethereum";
import { appIdentityToHash } from "../../../src/ethereum/utils/app-identity";
import { decodeMultisendCalldata } from "../../../src/ethereum/utils/multisend-decoder";
import { MultisigTransaction } from "../../../src/ethereum/utils/types";
import { AppInstance, StateChannel } from "../../../src/models";

/**
 * This test suite decodes a constructed OpInstall transaction object according
 * to the specifications defined by Counterfactual as can be found here:
 * https://specs.counterfactual.com/05-install-protocol#commitments
 */
describe("InstallCommitment", () => {
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
    ),
    new Map<string, AppInstance>(),
    new Map<AssetType, string>()
  );

  // Create free balance for ETH
  stateChannel.setupChannel(networkContext);

  let freeBalanceETH = stateChannel.getFreeBalanceFor(AssetType.ETH);

  // Set the state to some test values
  freeBalanceETH = freeBalanceETH.setState({
    alice: stateChannel.multisigOwners[0],
    bob: stateChannel.multisigOwners[1],
    aliceBalance: WeiPerEther,
    bobBalance: WeiPerEther
  });

  const app = new AppInstance(
    stateChannel.multisigAddress,
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
    stateChannel.sequenceNumber + 1,
    { foo: AddressZero, bar: 0 },
    0,
    Math.ceil(1000 * Math.random())
  );

  beforeAll(() => {
    tx = new InstallCommitment(
      networkContext,
      stateChannel.multisigAddress,
      stateChannel.multisigOwners,
      app.identity,
      app.terms,
      freeBalanceETH.identity,
      freeBalanceETH.terms,
      freeBalanceETH.hashOfLatestState,
      freeBalanceETH.nonce,
      freeBalanceETH.timeout,
      stateChannel.sequenceNumber + 1
    ).getTransactionDetails();
  });

  it("should be to MultiSend", () => {
    expect(tx.to).toBe(networkContext.MultiSend);
  });

  it("should have no value", () => {
    expect(tx.value).toBe(0);
  });

  describe("the calldata of the multisend transaction", () => {
    let transactions: [number, string, number, string][];

    beforeAll(() => {
      const { data } = tx;
      const desc = new Interface(MultiSend.abi).parseTransaction({ data });
      transactions = decodeMultisendCalldata(desc.args[0]);
    });

    it("should contain two transactions", () => {
      expect(transactions.length).toBe(2);
    });

    describe("the transaction to update the free balance", () => {
      let to: string;
      let val: number;
      let data: string;
      let op: number;

      beforeAll(() => {
        [op, to, val, data] = transactions[0];
      });

      it("should be to the AppRegistry", () => {
        expect(to).toBe(networkContext.AppRegistry);
      });

      it("should be of value 0", () => {
        expect(val).toEqual(Zero);
      });

      it("should be a Call", () => {
        expect(op).toBe(0);
      });

      describe("the calldata", () => {
        let iface: Interface;
        let calldata: TransactionDescription;

        beforeAll(() => {
          iface = new Interface(AppRegistry.abi);
          calldata = iface.parseTransaction({ data });
        });

        it("should be directed at the setState method", () => {
          expect(calldata.sighash).toBe(iface.functions.setState.sighash);
        });

        it("should build the expected AppIdentity argument", () => {
          const [
            [owner, signingKeys, appInterfaceHash, termsHash, defaultTimeout]
          ] = calldata.args;
          const expected = freeBalanceETH.identity;
          expect(owner).toBe(expected.owner);
          expect(signingKeys).toEqual(expected.signingKeys);
          expect(appInterfaceHash).toBe(expected.appInterfaceHash);
          expect(termsHash).toBe(expected.termsHash);
          expect(defaultTimeout).toEqual(bigNumberify(expected.defaultTimeout));
        });

        it("should build the expected SignedStateHashUpdate argument", () => {
          const [, [stateHash, nonce, timeout, signatures]] = calldata.args;
          expect(stateHash).toBe(freeBalanceETH.hashOfLatestState);
          expect(nonce).toEqual(bigNumberify(freeBalanceETH.nonce));
          expect(timeout).toEqual(bigNumberify(freeBalanceETH.timeout));
          expect(signatures).toBe(HashZero);
        });
      });
    });

    describe("the transaction to execute the conditional transaction", () => {
      let to: string;
      let val: number;
      let data: string;
      let op: number;

      beforeAll(() => {
        [op, to, val, data] = transactions[1];
      });

      it("should be to the StateChannelTransaction", () => {
        expect(to).toBe(networkContext.StateChannelTransaction);
      });

      it("should be of value 0", () => {
        expect(val).toEqual(Zero);
      });

      it("should be a DelegateCall", () => {
        expect(op).toBe(1);
      });

      describe("the calldata", () => {
        let iface: Interface;
        let calldata: TransactionDescription;

        beforeAll(() => {
          iface = new Interface(StateChannelTransaction.abi);
          calldata = iface.parseTransaction({ data });
        });

        it("should be directed at the executeAppConditionalTransaction method", () => {
          expect(calldata.sighash).toBe(
            iface.functions.executeAppConditionalTransaction.sighash
          );
        });

        it("should have correctly constructed arguments", () => {
          const [
            appRegistryAddress,
            nonceRegistryAddress,
            uninstallKey,
            appCfAddress,
            terms
          ] = calldata.args;
          expect(appRegistryAddress).toBe(networkContext.AppRegistry);
          expect(nonceRegistryAddress).toBe(networkContext.NonceRegistry);
          expect(uninstallKey).toBe(app.uninstallKey);
          expect(appCfAddress).toBe(appIdentityToHash(app.identity));
          expect(terms[0]).toBe(app.terms.assetType);
          expect(terms[1]).toEqual(app.terms.limit);
          expect(terms[2]).toBe(app.terms.token);
        });
      });
    });
  });
});
