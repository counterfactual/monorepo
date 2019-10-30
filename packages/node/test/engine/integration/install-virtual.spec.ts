import ChallengeRegistry from "@counterfactual/cf-adjudicator-contracts/expected-build-artifacts/ChallengeRegistry.json";
import DolphinCoin from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/DolphinCoin.json";
import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/ProxyFactory.json";
import TwoPartyFixedOutcomeApp from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/TwoPartyFixedOutcomeApp.json";
import { NetworkContextForTestSuite } from "@counterfactual/local-ganache-server";
import { OutcomeType } from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { AddressZero, HashZero, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber, Interface, parseEther, SigningKey } from "ethers/utils";

import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../src/constants";
import { encodeSingleAssetTwoPartyIntermediaryAgreementParams } from "../../../src/engine/install-virtual-app";
import { xkeysToSortedKthSigningKeys } from "../../../src/engine/xkeys";
import {
  ConditionalTransaction,
  SetStateCommitment
} from "../../../src/ethereum";
import { AppInstance, StateChannel } from "../../../src/models";
import { FreeBalanceClass } from "../../../src/models/free-balance";
import { SingleAssetTwoPartyIntermediaryAgreement } from "../../../src/models/state-channel";
import { transferERC20Tokens } from "../../integration/utils";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import {
  extendedPrvKeyToExtendedPubKey,
  getRandomExtendedPrvKeys
} from "./random-signing-keys";

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e9;

// The ChallengeRegistry.setState call _could_ be estimated but we haven't
// written this test to do that yet
const SETSTATE_COMMITMENT_GAS = 6e9;

let provider: JsonRpcProvider;
let wallet: Wallet;
let network: NetworkContextForTestSuite;
let appRegistry: Contract;

let erc20ContractAddress: string;
let erc20Contract: Contract;

let multisigOwnerKeys: SigningKey[];

let xpubs: string[];

const capitalProvider = Wallet.createRandom().address;
const virtualAppUser = Wallet.createRandom().address;

expect.extend({ toBeEq });

let twoPartyFixedOutcomeAppDefinition: Contract;

let proxyFactory: Contract;

beforeAll(async () => {
  jest.setTimeout(10000);

  [provider, wallet, {}] = await connectToGanache();

  network = global["networkContext"];

  appRegistry = new Contract(
    network.ChallengeRegistry,
    ChallengeRegistry.abi,
    wallet
  );

  erc20ContractAddress = network.DolphinCoin;

  erc20Contract = new Contract(
    erc20ContractAddress,
    DolphinCoin.abi,
    new JsonRpcProvider(global["ganacheURL"])
  );

  twoPartyFixedOutcomeAppDefinition = await new ContractFactory(
    TwoPartyFixedOutcomeApp.abi,
    TwoPartyFixedOutcomeApp.evm.bytecode,
    wallet
  ).deploy();

  proxyFactory = new Contract(network.ProxyFactory, ProxyFactory.abi, wallet);
});

describe("Scenario: Install virtual app with and put on-chain", () => {
  let globalChannelNonce = 0;

  let createProxy: () => Promise<void>;

  let fundWithETH: (
    wallet: Wallet,
    proxyAddress: string,
    amount: BigNumber
  ) => Promise<void>;

  let fundWithDolphinCoin: (
    proxyAddress: string,
    amount: BigNumber
  ) => Promise<void>;

  let setupChannel: (
    proxyAddress: string,
    tokenAmounts: BigNumber,
    tokenAddress: string
  ) => Promise<StateChannel>;

  let createTargetAppInstance: () => AppInstance;

  let setStatesAndOutcomes: (
    targetAppInstance: AppInstance,
    stateChannel: StateChannel
  ) => Promise<void>;

  beforeEach(async () => {
    const xprvs = getRandomExtendedPrvKeys(2);

    multisigOwnerKeys = xkeysToSortedKthSigningKeys(xprvs, 0);

    xpubs = xprvs.map(extendedPrvKeyToExtendedPubKey);

    globalChannelNonce += 1;

    createProxy = async function() {
      await proxyFactory.functions.createProxyWithNonce(
        network.MinimumViableMultisig,
        new Interface(MinimumViableMultisig.abi).functions.setup.encode([
          multisigOwnerKeys.map(x => x.address)
        ]),
        0,
        { gasLimit: CREATE_PROXY_AND_SETUP_GAS }
      );
    };

    fundWithETH = async function(
      wallet: Wallet,
      proxyAddress: string,
      amount: BigNumber
    ) {
      await wallet.sendTransaction({
        to: proxyAddress,
        value: amount
      });
    };

    fundWithDolphinCoin = async function(
      proxyAddress: string,
      amount: BigNumber
    ) {
      await transferERC20Tokens(
        proxyAddress,
        erc20ContractAddress,
        erc20Contract.abi,
        amount
      );
    };

    setupChannel = async function(
      proxyAddress: string,
      tokenAmounts: BigNumber,
      tokenAddress: string
    ) {
      return StateChannel.setupChannel(
        network.IdentityApp,
        proxyAddress,
        xpubs
      ).setFreeBalance(
        FreeBalanceClass.createWithFundedTokenAmounts(
          multisigOwnerKeys.map<string>(key => key.address),
          tokenAmounts,
          [tokenAddress]
        )
      );
    };

    createTargetAppInstance = function() {
      return new AppInstance(
        multisigOwnerKeys.map(x => x.address),
        /* default timeout */ 0,
        /* appInterface */ {
          addr: twoPartyFixedOutcomeAppDefinition.address,
          stateEncoding: "uint256",
          actionEncoding: undefined
        },
        true, // virtual
        globalChannelNonce, // app sequence number
        2, // latest state
        1, // latest versionNumber
        0, // latest timeout
        /* outcomeType */ OutcomeType.TWO_PARTY_FIXED_OUTCOME,
        {
          playerAddrs: [AddressZero, AddressZero],
          amount: "0x00",
          tokenAddress: AddressZero
        },
        undefined,
        undefined
      );
    };

    setStatesAndOutcomes = async function(
      targetAppInstance: AppInstance,
      stateChannel: StateChannel
    ) {
      const setStateCommitment = new SetStateCommitment(
        network,
        targetAppInstance.identity,
        targetAppInstance.hashOfLatestState,
        targetAppInstance.versionNumber,
        targetAppInstance.timeout
      );

      const setStateTx = setStateCommitment.getSignedTransaction([
        // TODO: Replace with k-th signing keys later
        multisigOwnerKeys[0].signDigest(setStateCommitment.hashToSign()),
        multisigOwnerKeys[1].signDigest(setStateCommitment.hashToSign())
      ]);

      await wallet.sendTransaction({
        ...setStateTx,
        gasLimit: SETSTATE_COMMITMENT_GAS
      });

      const setStateCommitmentForFreeBalance = new SetStateCommitment(
        network,
        stateChannel.freeBalance.identity,
        stateChannel.freeBalance.hashOfLatestState,
        stateChannel.freeBalance.versionNumber,
        0 // make the timeout 0 so this ends without a challenge timeout
      );

      await wallet.sendTransaction({
        ...setStateCommitmentForFreeBalance.getSignedTransaction([
          multisigOwnerKeys[0].signDigest(
            setStateCommitmentForFreeBalance.hashToSign()
          ),
          multisigOwnerKeys[1].signDigest(
            setStateCommitmentForFreeBalance.hashToSign()
          )
        ]),
        gasLimit: SETSTATE_COMMITMENT_GAS
      });

      await appRegistry.functions.setOutcome(
        targetAppInstance.identity,
        targetAppInstance.encodedLatestState
      );

      await appRegistry.functions.setOutcome(
        stateChannel.freeBalance.identity,
        stateChannel.freeBalance.encodedLatestState
      );
    };
  });

  it("returns the ERC20", async done => {
    proxyFactory.once("ProxyCreation", async (proxyAddress: string) => {
      await fundWithDolphinCoin(proxyAddress, parseEther("10"));

      let stateChannel = await setupChannel(
        proxyAddress,
        parseEther("5"),
        erc20ContractAddress
      );

      const targetAppInstance = createTargetAppInstance();

      const agreement: SingleAssetTwoPartyIntermediaryAgreement = {
        capitalProvider,
        virtualAppUser,
        capitalProvided: parseEther("10").toHexString(),
        tokenAddress: erc20Contract.address,
        /**
         * Note that this test cases does _not_ use a TimeLockedPassThrough, contrary
         * to how the protocol actually sets up virtual apps. This is because, in this
         * test case, we care mostly about retrieving _some_ outcome within the
         * TwoPartyFixedOutcomeFromVirtualAppInterpreter such that it is used to
         * distribute funds.
         */
        timeLockedPassThroughIdentityHash: HashZero
      };

      stateChannel = stateChannel.addSingleAssetTwoPartyIntermediaryAgreement(
        targetAppInstance.identityHash,
        agreement,
        {
          [multisigOwnerKeys[0].address]: parseEther("5"),
          [multisigOwnerKeys[1].address]: parseEther("5")
        },
        erc20Contract.address
      );

      await setStatesAndOutcomes(targetAppInstance, stateChannel);

      const commitment = new ConditionalTransaction(
        network, // network
        proxyAddress, // multisigAddress
        multisigOwnerKeys.map(x => x.address), // signing
        targetAppInstance.identityHash, // target
        stateChannel.freeBalance.identityHash, // fb
        network.TwoPartyFixedOutcomeFromVirtualAppInterpreter,
        encodeSingleAssetTwoPartyIntermediaryAgreementParams(agreement)
      );

      await wallet.sendTransaction({
        ...commitment.getSignedTransaction([
          multisigOwnerKeys[0].signDigest(commitment.hashToSign()),
          multisigOwnerKeys[1].signDigest(commitment.hashToSign())
        ]),
        gasLimit: 6e9
      });

      expect(await erc20Contract.functions.balanceOf(capitalProvider)).toBeEq(
        parseEther("5")
      );

      expect(await erc20Contract.functions.balanceOf(virtualAppUser)).toBeEq(
        parseEther("5")
      );

      done();
    });

    await createProxy();
  });

  it("returns the ETH ", async done => {
    proxyFactory.once("ProxyCreation", async (proxyAddress: string) => {
      await fundWithETH(wallet, proxyAddress, parseEther("10"));

      let stateChannel = await setupChannel(
        proxyAddress,
        parseEther("5"),
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      const targetAppInstance = createTargetAppInstance();

      const agreement: SingleAssetTwoPartyIntermediaryAgreement = {
        capitalProvider,
        virtualAppUser,
        capitalProvided: parseEther("10").toHexString(),
        tokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS,
        timeLockedPassThroughIdentityHash: HashZero
      };

      stateChannel = stateChannel.addSingleAssetTwoPartyIntermediaryAgreement(
        targetAppInstance.identityHash,
        agreement,
        {
          [multisigOwnerKeys[0].address]: parseEther("5"),
          [multisigOwnerKeys[1].address]: parseEther("5")
        },
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      await setStatesAndOutcomes(targetAppInstance, stateChannel);

      const commitment = new ConditionalTransaction(
        network, // network
        proxyAddress, // multisigAddress
        multisigOwnerKeys.map(x => x.address), // signing
        targetAppInstance.identityHash, // target
        stateChannel.freeBalance.identityHash, // fb
        network.TwoPartyFixedOutcomeFromVirtualAppInterpreter,
        encodeSingleAssetTwoPartyIntermediaryAgreementParams(agreement)
      );

      await wallet.sendTransaction({
        ...commitment.getSignedTransaction([
          multisigOwnerKeys[0].signDigest(commitment.hashToSign()),
          multisigOwnerKeys[1].signDigest(commitment.hashToSign())
        ]),
        gasLimit: 6e9
      });

      expect(await provider.getBalance(capitalProvider)).toBeEq(
        parseEther("5")
      );

      expect(await provider.getBalance(virtualAppUser)).toBeEq(parseEther("5"));

      done();
    });

    await createProxy();
  });
});
