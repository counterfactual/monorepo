import { AppIdentity } from "@counterfactual/types";
import { ethers } from "ethers";

// import MultiSend from "@counterfactual/contracts/build/contracts/MultiSend.json";
import AppRegistry from "@counterfactual/contracts/build/contracts/AppRegistry.json";
import MultiSend from "@counterfactual/contracts/build/contracts/MultiSend.json";
import StateChannelTransaction from "@counterfactual/contracts/build/contracts/StateChannelTransaction.json";

import { OpInstall } from "../../../src/middleware/protocol-operation";

const {
  keccak256,
  solidityPack,
  defaultAbiCoder,
  SigningKey,
  Interface,
  bigNumberify,
  hexDataSlice,
  hexDataLength
} = ethers.utils;

const {
  AddressZero,
  WeiPerEther,
  HashZero,
  Zero,
  MaxUint256
} = ethers.constants;

import { MultisigInput } from "../../../dist/src/middleware/protocol-operation/types";
import { APP_IDENTITY, APP_INTERFACE, TERMS } from "../../../src/encodings";

// FIXME: generaize, also used in op set state and op setup
const appIdentityToHash = (appIdentity: AppIdentity): string => {
  return ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode([APP_IDENTITY], [appIdentity])
  );
};

const freeBalanceAppInterfaceHash = keccak256(
  defaultAbiCoder.encode(
    [APP_INTERFACE],
    [
      {
        addr: AddressZero,
        resolve: new Interface([
          `resolve(
            tuple(address,address,uint256,uint256),
            tuple(uint8,uint256,address)
          )`
        ]).functions.resolve.sighash,
        getTurnTaker: "0x00000000",
        isStateTerminal: "0x00000000",
        applyAction: "0x00000000"
      }
    ]
  )
);

const freeBalanceTermsHash = keccak256(
  defaultAbiCoder.encode(
    [TERMS],
    [
      {
        assetType: 0,
        limit: 0,
        token: AddressZero
      }
    ]
  )
);

// TODO: Not as hard-coded
const freeBalanceAppStateHash = (alice: string, bob: string) =>
  keccak256(
    defaultAbiCoder.encode(
      ["tuple(address,address,uint256,uint256)"],
      [[alice, bob, WeiPerEther.div(2), WeiPerEther.div(2)]]
    )
  );

describe("OpInstall", () => {
  // https://specs.counterfactual.com/05-install-protocol#commitments
  describe("Installing a Simple App", async () => {
    let operation: OpInstall;

    const TEST_NONCE_UNIQUE_ID = 1;

    // Test network context
    const networkContext = {
      StateChannelTransaction: AddressZero,
      MultiSend: AddressZero,
      NonceRegistry: AddressZero,
      AppRegistry: AddressZero,
      PaymentApp: AddressZero,
      ETHBalanceRefund: AddressZero
    };

    // Test state channel / multisig values
    const multisig = AddressZero;
    const multisigOwners = [
      // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
      new SigningKey(
        "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
      ),
      // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
      new SigningKey(
        "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
      )
    ];

    // Test app-values
    const newAppOwner = multisig;
    const newAppSigningKeys = multisigOwners.map(x => x.address);
    const newAppInterface = {
      addr: AddressZero,
      getTurnTaker: "0x00000000",
      resolve: "0x00000000",
      applyAction: "0x00000000",
      isStateTerminal: "0x00000000"
    };
    const newAppTerms = {
      assetType: 0,
      limit: bigNumberify(10),
      token: AddressZero
    };
    const newAppDefaultTimeout = 100;
    const newAppAppIdentity = {
      defaultTimeout: newAppDefaultTimeout,
      owner: newAppOwner,
      signingKeys: newAppSigningKeys,
      appInterfaceHash: keccak256(
        defaultAbiCoder.encode([APP_INTERFACE], [newAppInterface])
      ),
      termsHash: keccak256(defaultAbiCoder.encode([TERMS], [newAppTerms]))
    };

    // FIXME: figure out jest extending
    // TODO: move into other file
    // expect.extend({
    //   toBeBigNumber: (
    //     received: BigNumberish,
    //     actual: BigNumberish
    //   ) => ({
    //     message: () => `expected ${received} not to equal ${actual}`,
    //     pass: ethers.utils
    //       .bigNumberify(received)
    //       .eq(bigNumberify(actual))
    //   })
    // });

    beforeAll(() => {
      operation = new OpInstall(
        networkContext,
        multisig,
        multisigOwners.map(x => x.address),
        newAppAppIdentity,
        newAppTerms,
        {
          owner: multisig,
          signingKeys: multisigOwners.map(x => x.address),
          appInterfaceHash: freeBalanceAppInterfaceHash,
          termsHash: freeBalanceTermsHash,
          defaultTimeout: 100
        },
        {
          assetType: 0, // ETH
          limit: MaxUint256,
          token: AddressZero
        },
        freeBalanceAppStateHash(
          multisigOwners[0].address,
          multisigOwners[1].address
        ),
        10,
        100,
        keccak256(solidityPack(["uint256"], [TEST_NONCE_UNIQUE_ID])),
        0
      );
    });

    describe("the transaction representing the commitment to be signed", () => {
      let tx: MultisigInput;

      beforeAll(() => {
        tx = operation.multisigInput();
      });

      it("should be to MultiSend", () => {
        expect(tx.to).toBe(networkContext.MultiSend);
      });

      it("should have no value", () => {
        expect(tx.val).toBe(0);
      });

      describe("the calldata of the multisend transaction", () => {
        let transactions: [number, string, number, string][];

        beforeAll(() => {
          const { data } = tx;
          const desc = new Interface(MultiSend.abi).parseTransaction({ data });
          function decodeMultisendCalldata(txs: string) {
            const ret: [number, string, number, string][] = [];

            let i = 0;
            while (i < hexDataLength(txs)) {
              const op = hexDataSlice(txs, i, i + 32);
              const to = hexDataSlice(txs, i + 32, i + 64);
              const val = hexDataSlice(txs, i + 64, i + 96);
              // NOTE: 96--128 _must_ be 0x80, a pointer to the data
              const len = parseInt(hexDataSlice(txs, i + 128, i + 160), 16);
              const data = hexDataSlice(txs, i + 160, i + 160 + len);
              ret.push([
                defaultAbiCoder.decode(["uint8"], op)[0],
                defaultAbiCoder.decode(["address"], to)[0],
                defaultAbiCoder.decode(["uint256"], val)[0],
                data
              ]);
              i += 160 + Math.ceil(len / 32) * 32;
            }

            return ret;
          }

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
            let iface: ethers.utils.Interface;
            let calldata: ethers.utils.TransactionDescription;

            beforeAll(() => {
              iface = new Interface(AppRegistry.abi);
              calldata = iface.parseTransaction({ data });
            });

            it("should be directed at the setState method", () => {
              expect(calldata.name).toBe(iface.functions.setState.signature);
            });

            it("should build the expected AppIdentity argument", () => {
              const [
                [
                  owner,
                  signingKeys,
                  appInterfaceHash,
                  termsHash,
                  defaultTimeout
                ]
              ] = calldata.args;

              expect(owner).toBe(multisig);
              expect(signingKeys).toEqual(multisigOwners.map(x => x.address));
              expect(appInterfaceHash).toBe(freeBalanceAppInterfaceHash);
              expect(termsHash).toBe(freeBalanceTermsHash);
              expect(defaultTimeout).toEqual(bigNumberify(100));
            });

            it("should build the expected SignedStateHashUpdate argument", () => {
              const [, [stateHash, nonce, timeout, signatures]] = calldata.args;

              // TODO: Should be based on the app being installed not hardcoded
              const expectedStateHash = freeBalanceAppStateHash(
                multisigOwners[0].address,
                multisigOwners[1].address
              );

              expect(stateHash).toBe(expectedStateHash);
              expect(nonce).toEqual(bigNumberify(10));
              expect(timeout).toEqual(bigNumberify(100));
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
            let iface: ethers.utils.Interface;
            let calldata: ethers.utils.TransactionDescription;

            beforeAll(() => {
              iface = new Interface(StateChannelTransaction.abi);
              calldata = iface.parseTransaction({ data });
            });

            it("should be directed at the executeAppConditionalTransaction method", () => {
              expect(calldata.name).toBe(
                iface.functions.executeAppConditionalTransaction.signature
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

              // The unique "key" in the NonceRegistry is computed to be:
              // hash(<multisig address>, <timeout = 0>, hash(<app nonce>))
              // where <app nonce> is 0 since FreeBalance is assumed to be the
              // firstmost intalled app in the channel.
              const expectedUninstallKey = keccak256(
                solidityPack(
                  ["address", "uint256", "uint256"],
                  [
                    multisig,
                    0,
                    keccak256(solidityPack(["uint256"], [TEST_NONCE_UNIQUE_ID]))
                  ]
                )
              );

              expect(appRegistryAddress).toBe(networkContext.AppRegistry);
              expect(nonceRegistryAddress).toBe(networkContext.NonceRegistry);
              expect(uninstallKey).toBe(expectedUninstallKey);
              expect(appCfAddress).toBe(appIdentityToHash(newAppAppIdentity));
              expect(terms[0]).toBe(newAppTerms.assetType);
              expect(terms[1]).toEqual(newAppTerms.limit);
              expect(terms[2]).toBe(newAppTerms.token);
            });
          });
        });
      });
    });

    // it("should generate a transaction to the multisig when signed", () => {
    //   const digest = operation.hashToSign();

    //   const signatures = [
    //     multisigOwners[0].signDigest(digest),
    //     multisigOwners[1].signDigest(digest)
    //   ];

    //   const { to, value, data } = operation.transaction(signatures);

    //   expect(to).toBe(multisig);
    //   expect(value).toBe(0);
    // });
  });
});
