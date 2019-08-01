import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { HashZero, One } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import {
  BigNumberish,
  defaultAbiCoder,
  hexlify,
  joinSignature,
  keccak256,
  randomBytes,
  SigningKey
} from "ethers/utils";

import AppInstanceAdjudicator from "../build/AppInstanceAdjudicator.json";
import AppWithAction from "../build/AppWithAction.json";

import {
  AppIdentityTestClass,
  expect,
  sortSignaturesBySignerAddress
} from "./utils";

type AppInstanceState = {
  appDefinition: string;
  participants: string[];
  stateType: 0 | 1;
  actionTaken: string;
  appAttributes: string;
  challengeTimeout: BigNumberish;
  nonce: BigNumberish;
  versionNum: BigNumberish;
};

type MaybeOutcome = {
  finalizedAt: BigNumberish;
  outcome: string;
  challengeAppInstanceState: AppInstanceState;
};

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

const channelStateEncoding = `
  tuple(
    address appDefinition,
    address[] participants,
    uint8 stateType,
    bytes actionTaken,
    bytes appAttributes,
    uint256 challengeTimeout,
    uint32 nonce,
    uint32 versionNum
  )
`;

describe("AppInstanceAdjudicator", () => {
  let provider: Web3Provider;
  let wallet: Wallet;
  let globalChannelNonce = 0;

  let adjudicator: Contract;
  let appWithAction: Contract;

  let setStateWithSignatures: (
    versionNumber: BigNumberish,
    appState?: string,
    timeout?: BigNumberish
  ) => Promise<void>;
  let respondWithMove: () => Promise<void>;
  let sendSignedFinalizationToChain: () => Promise<any>;
  let getChallenge: () => Promise<MaybeOutcome>;
  let latestAppState: () => Promise<string>;
  let latestVersionNumber: () => Promise<BigNumberish>;
  let isAppInstanceFinalized: () => Promise<boolean>;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    adjudicator = await waffle.deployContract(
      wallet,
      AppInstanceAdjudicator,
      [],
      {
        gasLimit: 6500000 // override default of 4 million
      }
    );

    appWithAction = await waffle.deployContract(wallet, AppWithAction);
  });

  beforeEach(async () => {
    const appIdentityTestObject = new AppIdentityTestClass(
      [ALICE.address, BOB.address],
      appWithAction.address,
      10,
      globalChannelNonce
    );

    globalChannelNonce += 1;

    getChallenge = () =>
      adjudicator.functions.getChallenge(appIdentityTestObject.identityHash);

    latestAppState = async () =>
      (await getChallenge()).challengeAppInstanceState.appAttributes;

    latestVersionNumber = async () =>
      (await getChallenge()).challengeAppInstanceState.versionNum;

    isAppInstanceFinalized = async () =>
      await adjudicator.functions.isAppInstanceFinalized(
        appIdentityTestObject.identityHash
      );

    respondWithMove = async () => {
      const response = {
        appDefinition: appIdentityTestObject.appDefinition,
        participants: appIdentityTestObject.participants,
        stateType: 0,
        actionTaken: defaultAbiCoder.encode(
          ["tuple(uint8 actionType, uint256 increment)"],
          [
            {
              actionType: 0,
              increment: 1
            }
          ]
        ),
        appAttributes: defaultAbiCoder.encode(
          [`tuple(uint256 counter)`],
          [{ counter: 1 }]
        ),
        challengeTimeout: appIdentityTestObject.appIdentity.defaultTimeout,
        nonce: appIdentityTestObject.appIdentity.channelNonce,
        versionNum: One.add(await latestVersionNumber())
      };
      const digest = keccak256(
        defaultAbiCoder.encode([channelStateEncoding], [response])
      );
      await adjudicator.functions.respondWithMove(
        response,
        joinSignature(await new SigningKey(ALICE.privateKey).signDigest(digest))
      );
    };

    setStateWithSignatures = async (
      versionNumber: BigNumberish,
      appState: string = defaultAbiCoder.encode(
        [`tuple(uint256 counter)`],
        [{ counter: 0 }]
      ),
      timeout: BigNumberish = ONCHAIN_CHALLENGE_TIMEOUT
    ) => {
      const channelState = {
        appDefinition: appIdentityTestObject.appDefinition,
        participants: appIdentityTestObject.participants,
        stateType: 0,
        actionTaken: HashZero,
        appAttributes: appState,
        challengeTimeout: timeout,
        nonce: appIdentityTestObject.appIdentity.channelNonce,
        versionNum: versionNumber
      };
      const digest = keccak256(
        defaultAbiCoder.encode([channelStateEncoding], [channelState])
      );
      await adjudicator.functions.challengeUnanimous(
        channelState,
        sortSignaturesBySignerAddress(digest, [
          await new SigningKey(ALICE.privateKey).signDigest(digest),
          await new SigningKey(BOB.privateKey).signDigest(digest)
        ]).map(joinSignature)
      );
    };

    sendSignedFinalizationToChain = async () =>
      await setStateWithSignatures(
        One.add(await latestVersionNumber()),
        await latestAppState(),
        0
      );
  });

  describe("calling challengeUnanimous", () => {
    it("should work with higher versionNumber", async () => {
      expect(await latestVersionNumber()).to.eq(0);
      await setStateWithSignatures(1);
      expect(await latestVersionNumber()).to.eq(1);
    });

    it("should be respondable", async () => {
      expect(await latestVersionNumber()).to.eq(0);
      await setStateWithSignatures(1);
      expect(await latestVersionNumber()).to.eq(1);
      await respondWithMove();
    });
  });

  describe("finalizing app state", async () => {
    it("should work with keys", async () => {
      expect(await isAppInstanceFinalized()).to.be.false;
      await sendSignedFinalizationToChain();
      expect(await isAppInstanceFinalized()).to.be.true;
    });
  });

  describe("waiting for timeout", async () => {
    it("should block updates after the timeout", async () => {
      expect(await isAppInstanceFinalized()).to.be.false;

      await setStateWithSignatures(1);

      for (const _ of Array(ONCHAIN_CHALLENGE_TIMEOUT + 1)) {
        await provider.send("evm_mine", []);
      }

      expect(await isAppInstanceFinalized()).to.be.true;

      await expect(setStateWithSignatures(2)).to.be.reverted;

      await expect(setStateWithSignatures(0)).to.be.reverted;
    });
  });

  it("is possible to call setState to put state on-chain", async () => {
    // Tell the ChallengeRegistry to start timer
    const state = hexlify(randomBytes(32));

    await setStateWithSignatures(1, state);

    // Verify the correct data was put on-chain
    const {
      finalizedAt,
      challengeAppInstanceState: { versionNum, appAttributes }
    } = await getChallenge();

    expect(appAttributes).to.be.eq(state);
    expect(finalizedAt).to.be.eq(
      (await provider.getBlockNumber()) + ONCHAIN_CHALLENGE_TIMEOUT
    );
    expect(versionNum).to.be.eq(1);
  });
});
