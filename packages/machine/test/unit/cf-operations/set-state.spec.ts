import { cf } from "@counterfactual/cf.js";

import { ethers } from "ethers";
import { HashZero } from "ethers/constants";

import { OpSetState } from "../../../src/middleware/protocol-operation";

import {
  APP_IDENTITY,
  APP_INTERFACE,
  SIGNED_STATE_HASH_UPDATE,
  TERMS
} from "../../../src/encodings";

const { keccak256, defaultAbiCoder, solidityPack } = ethers.utils;
const { AddressZero } = ethers.constants;

// Test network context
const networkContext = {
  StateChannelTransaction: AddressZero,
  MultiSend: AddressZero,
  NonceRegistry: AddressZero,
  AppRegistry: AddressZero,
  PaymentApp: AddressZero,
  ETHBalanceRefund: AddressZero
};

// Test users
const ALICE =
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new ethers.utils.SigningKey(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
  );

const BOB =
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new ethers.utils.SigningKey(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
  );

// Test app-values
const owner = AddressZero;
const signingKeys = [ALICE.address, BOB.address];
const appInterface = {
  addr: AddressZero,
  getTurnTaker: "0x00000000",
  resolve: "0x00000000",
  applyAction: "0x00000000",
  isStateTerminal: "0x00000000"
};
const terms = {
  assetType: 0,
  limit: 10,
  token: AddressZero
};
const defaultTimeout = 100;
const appIdentity = {
  defaultTimeout,
  owner,
  signingKeys,
  appInterfaceHash: keccak256(
    defaultAbiCoder.encode([APP_INTERFACE], [appInterface])
  ),
  termsHash: keccak256(defaultAbiCoder.encode([TERMS], [terms]))
};

// https://specs.counterfactual.com/06-update-protocol#commitments
describe("OpSetState", () => {
  function expectedSetStateProtocolData(
    stateHash: string,
    nonce: number,
    timeout: number,
    signatures: ethers.utils.Signature[]
  ): string {
    return new ethers.utils.Interface([
      `setState(${APP_IDENTITY},${SIGNED_STATE_HASH_UPDATE})`
    ]).functions.setState.encode([
      appIdentity,
      {
        stateHash,
        nonce,
        timeout,
        signatures: cf.utils.signaturesToBytes(...signatures)
      }
    ]);
  }

  it("Should be able to compute the correct tx to submit on-chain", () => {
    const stateHash = HashZero;
    const nonce = 0;
    const timeout = 0;

    const operation = new OpSetState(
      networkContext,
      appIdentity,
      stateHash,
      nonce,
      timeout
    );

    const digest = operation.hashToSign();

    const signatures = [ALICE.signDigest(digest), BOB.signDigest(digest)];

    const expectedTxData = expectedSetStateProtocolData(
      stateHash,
      nonce,
      timeout,
      signatures
    );

    const tx = operation.transaction(signatures);

    expect(tx.to).toBe(networkContext.AppRegistry);
    expect(tx.value).toBe(0);
    expect(tx.data).toBe(expectedTxData);
  });

  it("Should compute the correct hash to sign", () => {
    const stateHash = HashZero;
    const nonce = 0;
    const timeout = 0;

    const operation = new OpSetState(
      networkContext,
      appIdentity,
      stateHash,
      nonce,
      timeout
    );

    const digest = ethers.utils.keccak256(
      solidityPack(
        ["bytes1", "bytes32", "uint256", "uint256", "bytes32"],
        [
          "0x19",
          keccak256(defaultAbiCoder.encode([APP_IDENTITY], [appIdentity])),
          nonce,
          timeout,
          stateHash
        ]
      )
    );

    expect(operation.hashToSign()).toBe(digest);
  });
});
