import { SolidityValueType } from "@counterfactual/types";
import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { HashZero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import {
  bigNumberify,
  defaultAbiCoder,
  joinSignature,
  keccak256,
  SigningKey
} from "ethers/utils";

import AppWithAction from "../expected-build-artifacts/AppWithAction.json";
import ChallengeRegistry from "../expected-build-artifacts/ChallengeRegistry.json";

import {
  AppIdentityTestClass,
  computeAppChallengeHash,
  expect,
  signaturesToBytes,
  sortSignaturesBySignerAddress
} from "./utils";

enum ActionType {
  SUBMIT_COUNTER_INCREMENT,
  ACCEPT_INCREMENT
}

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
  counter: bigNumberify(0)
};

const ACTION = {
  actionType: ActionType.SUBMIT_COUNTER_INCREMENT,
  increment: bigNumberify(2)
};

function encodeState(state: SolidityValueType) {
  return defaultAbiCoder.encode([`tuple(uint256 counter)`], [state]);
}

function encodeAction(action: SolidityValueType) {
  return defaultAbiCoder.encode(
    [`tuple(uint8 actionType, uint256 increment)`],
    [action]
  );
}

describe("ChallengeRegistry Challenge", () => {
  let provider: Web3Provider;
  let wallet: Wallet;

  let appRegistry: Contract;
  let appDefinition: Contract;

  let setState: (versionNumber: number, appState?: string) => Promise<void>;
  let latestState: () => Promise<string>;
  let latestVersionNumber: () => Promise<number>;
  let respondToChallenge: (
    state: any,
    action: any,
    actionSig: any
  ) => Promise<any>;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    appRegistry = await waffle.deployContract(wallet, ChallengeRegistry, [], {
      gasLimit: 6000000 // override default of 4 million
    });

    appDefinition = await waffle.deployContract(wallet, AppWithAction);
  });

  beforeEach(async () => {
    const appInstance = new AppIdentityTestClass(
      [ALICE.address, BOB.address],
      appDefinition.address,
      10,
      123456
    );

    latestState = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.identityHash))
        .appStateHash;

    latestVersionNumber = async () =>
      (await appRegistry.functions.getAppChallenge(appInstance.identityHash))
        .versionNumber;

    setState = async (versionNumber: number, appState?: string) => {
      const stateHash = keccak256(appState || HashZero);
      const digest = computeAppChallengeHash(
        appInstance.identityHash,
        stateHash,
        versionNumber,
        ONCHAIN_CHALLENGE_TIMEOUT
      );
      await appRegistry.functions.setState(appInstance.appIdentity, {
        versionNumber,
        appStateHash: stateHash,
        timeout: ONCHAIN_CHALLENGE_TIMEOUT,
        signatures: sortSignaturesBySignerAddress(digest, [
          await new SigningKey(ALICE.privateKey).signDigest(digest),
          await new SigningKey(BOB.privateKey).signDigest(digest)
        ]).map(joinSignature)
      });
    };

    respondToChallenge = (state: any, action: any, actionSig: any) =>
      appRegistry.functions.respondToChallenge(
        appInstance.appIdentity,
        encodeState(state),
        encodeAction(action),
        actionSig
      );
  });

  it("Can call respondToChallenge", async () => {
    expect(await latestVersionNumber()).to.eq(0);

    await setState(1, encodeState(PRE_STATE));

    expect(await latestVersionNumber()).to.eq(1);

    const signer = new SigningKey(BOB.privateKey);
    const thingToSign = keccak256(encodeAction(ACTION));
    const signature = await signer.signDigest(thingToSign);
    const bytes = signaturesToBytes(signature);

    expect(await latestState()).to.be.eql(keccak256(encodeState(PRE_STATE)));

    await respondToChallenge(PRE_STATE, ACTION, bytes);

    expect(await latestState()).to.be.eql(HashZero);
  });

  it("Cannot call respondToChallenge with incorrect turn taker", async () => {
    await setState(1, encodeState(PRE_STATE));

    const signer = new SigningKey(ALICE.privateKey);
    const thingToSign = keccak256(encodeAction(ACTION));
    const signature = await signer.signDigest(thingToSign);
    const bytes = signaturesToBytes(signature);

    await expect(
      respondToChallenge(PRE_STATE, ACTION, bytes)
    ).to.be.revertedWith("Action must have been signed by correct turn taker");
  });
});
