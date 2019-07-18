import { NetworkContextForTestSuite } from "@counterfactual/chain/src/contract-deployments.jest";
import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import TwoPartyFixedOutcomeApp from "@counterfactual/contracts/build/TwoPartyFixedOutcomeApp.json";
import { OutcomeType } from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { AddressZero, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber, Interface, parseEther, SigningKey } from "ethers/utils";

import {
  ConditionalTransaction,
  SetStateCommitment
} from "../../../src/ethereum";
import { xkeysToSortedKthSigningKeys } from "../../../src/machine/xkeys";
import { AppInstance, StateChannel } from "../../../src/models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../src/models/free-balance";
import { encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams } from "../../../src/protocol/install-virtual-app";
import {
  createFreeBalanceStateWithFundedTokenAmounts,
  transferERC20Tokens
} from "../../integration/utils";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { getRandomHDNodes } from "./random-signing-keys";

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

const beneficiaries: [string, string] = [
  Wallet.createRandom().address,
  Wallet.createRandom().address
];

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

  const xkeys = getRandomHDNodes(2);
  multisigOwnerKeys = xkeysToSortedKthSigningKeys(
    xkeys.map(x => x.extendedKey),
    0
  );

  xpubs = xkeys.map(x => x.neuter().extendedKey);

  twoPartyFixedOutcomeAppDefinition = await new ContractFactory(
    TwoPartyFixedOutcomeApp.abi,
    TwoPartyFixedOutcomeApp.bytecode,
    wallet
  ).deploy();

  proxyFactory = new Contract(network.ProxyFactory, ProxyFactory.abi, wallet);
});

async function createProxy() {
  await proxyFactory.functions.createProxy(
    network.MinimumViableMultisig,
    new Interface(MinimumViableMultisig.abi).functions.setup.encode([
      multisigOwnerKeys.map(x => x.address)
    ]),
    { gasLimit: CREATE_PROXY_AND_SETUP_GAS }
  );
}

async function fundWithETH(
  wallet: Wallet,
  proxyAddress: string,
  amount: BigNumber
) {
  await wallet.sendTransaction({
    to: proxyAddress,
    value: amount
  });
}

async function fundWithDolphinCoin(
  wallet: Wallet,
  proxyAddress: string,
  amount: BigNumber
) {
  await transferERC20Tokens(
    proxyAddress,
    erc20ContractAddress,
    erc20Contract.abi,
    amount
  );
}

async function setupChannel(
  proxyAddress: string,
  tokenAmounts: BigNumber,
  tokenAddress: string
) {
  return StateChannel.setupChannel(
    network.FreeBalanceApp,
    proxyAddress,
    xpubs
  ).setFreeBalance(
    createFreeBalanceStateWithFundedTokenAmounts(
      multisigOwnerKeys.map<string>(key => key.address),
      tokenAmounts,
      [tokenAddress]
    )
  );
}

function createTargetAppInstance(stateChannel: StateChannel) {
  return new AppInstance(
    stateChannel.multisigAddress,
    stateChannel.multisigOwners,
    /* default timeout */ 0,
    /* appInterface */ {
      addr: twoPartyFixedOutcomeAppDefinition.address,
      stateEncoding: "uint256",
      actionEncoding: undefined
    },
    true, // virtual
    0, // app sequence number
    2, // latest state
    1, // latest versionNumber
    0, // latest timeout
    /* outcomeType */ OutcomeType.TWO_PARTY_FIXED_OUTCOME,
    {
      playerAddrs: [AddressZero, AddressZero],
      amount: Zero
    },
    undefined
  );
}

async function setStatesAndOutcomes(
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
}

describe("Scenario: Install virtual app with ERC20, put on-chain", () => {
  it("returns the ERC20", async done => {
    proxyFactory.once("ProxyCreation", async (proxyAddress: string) => {
      await fundWithDolphinCoin(wallet, proxyAddress, parseEther("10"));

      let stateChannel = await setupChannel(
        proxyAddress,
        parseEther("5"),
        erc20ContractAddress
      );

      const targetAppInstance = createTargetAppInstance(stateChannel);

      const agreement = {
        beneficiaries,
        capitalProvided: parseEther("10"),
        expiryBlock: (await provider.getBlockNumber()) + 1000,
        tokenAddress: erc20Contract.address
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
        network.TwoPartyFixedOutcomeFromVirtualAppETHInterpreter,
        encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams(agreement)
      );

      await wallet.sendTransaction({
        ...commitment.getSignedTransaction([
          multisigOwnerKeys[0].signDigest(commitment.hashToSign()),
          multisigOwnerKeys[1].signDigest(commitment.hashToSign())
        ]),
        gasLimit: 6e9
      });

      expect(await erc20Contract.functions.balanceOf(beneficiaries[0])).toBeEq(
        parseEther("5")
      );

      expect(await erc20Contract.functions.balanceOf(beneficiaries[1])).toBeEq(
        parseEther("5")
      );
      done();
    });

    await createProxy();
  });
});

describe("Scenario: install virtual AppInstance, put on-chain", () => {
  it("returns the ETH the app had locked up", async done => {
    proxyFactory.once("ProxyCreation", async (proxyAddress: string) => {
      await fundWithETH(wallet, proxyAddress, parseEther("10"));

      let stateChannel = await setupChannel(
        proxyAddress,
        parseEther("5"),
        CONVENTION_FOR_ETH_TOKEN_ADDRESS
      );

      const targetAppInstance = createTargetAppInstance(stateChannel);

      const agreement = {
        beneficiaries,
        capitalProvided: parseEther("10"),
        expiryBlock: (await provider.getBlockNumber()) + 1000,
        tokenAddress: CONVENTION_FOR_ETH_TOKEN_ADDRESS
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
        network.TwoPartyFixedOutcomeFromVirtualAppETHInterpreter,
        encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams(agreement)
      );

      await wallet.sendTransaction({
        ...commitment.getSignedTransaction([
          multisigOwnerKeys[0].signDigest(commitment.hashToSign()),
          multisigOwnerKeys[1].signDigest(commitment.hashToSign())
        ]),
        gasLimit: 6e9
      });

      expect(await provider.getBalance(beneficiaries[0])).toBeEq(
        parseEther("5")
      );

      expect(await provider.getBalance(beneficiaries[1])).toBeEq(
        parseEther("5")
      );

      done();
    });

    await createProxy();
  });
});
