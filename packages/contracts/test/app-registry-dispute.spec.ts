import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { AddressZero, HashZero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { keccak256, defaultAbiCoder, bigNumberify, SigningKey } from "ethers/utils";

import AppRegistry from "../build/AppRegistry.json";
import AppWithAction from "../build/AppWithAction.json";

import {
  AppInstance,
  AssetType,
  expect,
  Terms
} from "./utils";
import { SolidityABIEncoderV2Type } from "@counterfactual/types";

import { utils } from "@counterfactual/cf.js";
const { signaturesToBytes } = utils;

const ALICE =
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new Wallet(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
  );

const BOB =
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new Wallet(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
  );

// HELPER DATA
const ONCHAIN_CHALLENGE_TIMEOUT = 30;

const PRE_STATE = {
  player1: ALICE.address,
  player2: BOB.address,
  counter: bigNumberify(3)
};

const ACTION = {
  increment: bigNumberify(2)
};

// todo(xuanji): this is manually calculated
const POST_STATE = {
  player1: ALICE.address,
  player2: BOB.address,
  counter: bigNumberify(5)
}

function encodeState(state: SolidityABIEncoderV2Type) {
  return defaultAbiCoder.encode(
    [
      `
      tuple(
        address player1,
        address player2,
        uint256 counter
      )
      `
    ],
    [state]
  );
}

function encodeAction(state: SolidityABIEncoderV2Type) {
  return defaultAbiCoder.encode(
    [
      `
      tuple(
        uint256 increment
      )
    `
    ],
    [state]
  );
}

describe("AppRegistry Dispute", () => {
  let provider: Web3Provider;
  let wallet: Wallet;

  let appRegistry: Contract;
  let appDefinition: Contract

  let setStateAsOwner: (nonce: number, appState?: string) => Promise<void>;
  let latestState: () => Promise<string>;
  let latestNonce: () => Promise<number>;
  let progressChallenge: (state: any, action: any, actionSig: any)  => Promise<any>;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    appRegistry = await waffle.deployContract(wallet, AppRegistry, [], {
      gasLimit: 6000000 // override default of 4 million
    });

    appDefinition = await waffle.deployContract(wallet, AppWithAction);
  });

  beforeEach(async () => {
    const appInstance = new AppInstance(
      wallet.address,
      [ALICE.address, BOB.address],
      appDefinition.address,
      new Terms(AssetType.ETH, 0, AddressZero),
      10
    );

    latestState = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.identityHash))
        .appStateHash;

    latestNonce = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.identityHash))
        .nonce;

    setStateAsOwner = (nonce: number, appState?: string) =>
      appRegistry.functions.setState(appInstance.appIdentity, {
        nonce,
        appStateHash: appState || HashZero,
        timeout: ONCHAIN_CHALLENGE_TIMEOUT,
        signatures: HashZero
      });

    progressChallenge = (state: any, action: any, actionSig: any) =>
      appRegistry.functions.progressChallenge(
        appInstance.appIdentity,
        encodeState(state),
        encodeAction(action),
        actionSig,
        false
      );
  });

  it("Can call progressChallenge", async () => {
    expect(await latestNonce()).to.eq(0);
    await setStateAsOwner(1, keccak256(encodeState(PRE_STATE)));
    expect(await latestNonce()).to.eq(1);

    const signer = new SigningKey(BOB.privateKey);
    const thingToSign = keccak256(encodeAction(ACTION));
    const signature = await signer.signDigest(thingToSign);
    const bytes = signaturesToBytes(signature);

    expect(await latestState()).to.be.eql(keccak256(encodeState(PRE_STATE)));
    await progressChallenge(PRE_STATE, ACTION, bytes);
    expect(await latestState()).to.be.eql(keccak256(encodeState(POST_STATE)));
  });
});
