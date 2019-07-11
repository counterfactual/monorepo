import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import TwoPartyFixedOutcomeApp from "@counterfactual/contracts/build/TwoPartyFixedOutcomeApp.json";
import { NetworkContext } from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { AddressZero, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { defaultAbiCoder, Interface, parseEther } from "ethers/utils";

import {
  ConditionalTransaction,
  SetStateCommitment
} from "../../../src/ethereum";
import { xkeysToSortedKthSigningKeys } from "../../../src/machine/xkeys";
import { AppInstance, StateChannel } from "../../../src/models";
import { CONVENTION_FOR_ETH_TOKEN_ADDRESS } from "../../../src/models/free-balance";
import { createFreeBalanceStateWithFundedETHAmounts } from "../../integration/utils";

import { toBeEq } from "./bignumber-jest-matcher";
import { connectToGanache } from "./connect-ganache";
import { getRandomHDNodes } from "./random-signing-keys";

// ProxyFactory.createProxy uses assembly `call` so we can't estimate
// gas needed, so we hard-code this number to ensure the tx completes
const CREATE_PROXY_AND_SETUP_GAS = 6e9;

// The ChallengeRegistry.setState call _could_ be estimated but we haven't
// written this test to do that yet
const SETSTATE_COMMITMENT_GAS = 6e9;

/**
 * As specified in TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.sol
 *
 * NOTE: It seems like you can't put "payable" inside this string, ethers doesn't
 *       know how to interpret it. However, the encoder encodes it the same way
 *       without specifying it anyway, so that's why beneficiaries is address[2]
 *       despite what you see in TwoPartyFixedOutcomeFromVirtualAppETHInterpreter.
 *
 */
const SINGLE_ASSET_TWO_PARTY_INTERMEDIARY_AGREEMENT_ENCODING = `
  tuple(
    uint256 capitalProvided,
    uint256 expiryBlock,
    address[2] beneficiaries
  )
`;

const encodeTwoPartyFixedOutcomeFromVirtualAppETHInterpreterParams = params =>
  defaultAbiCoder.encode(
    [SINGLE_ASSET_TWO_PARTY_INTERMEDIARY_AGREEMENT_ENCODING],
    [params]
  );

let provider: JsonRpcProvider;
let wallet: Wallet;
let network: NetworkContext;
let appRegistry: Contract;

expect.extend({ toBeEq });

beforeAll(async () => {
  jest.setTimeout(10000);
  [provider, wallet, {}] = await connectToGanache();

  network = global["networkContext"];

  appRegistry = new Contract(
    network.ChallengeRegistry,
    ChallengeRegistry.abi,
    wallet
  );
});

describe("Scenario: install virtual AppInstance, put on-chain", () => {
  it("returns the funds the app had locked up", async done => {
    const xkeys = getRandomHDNodes(2);

    const multisigOwnerKeys = xkeysToSortedKthSigningKeys(
      xkeys.map(x => x.extendedKey),
      0
    );

    const twoPartyFixedOutcomeAppDefinition = await new ContractFactory(
      TwoPartyFixedOutcomeApp.abi,
      TwoPartyFixedOutcomeApp.bytecode,
      wallet
    ).deploy();

    const proxyFactory = new Contract(
      network.ProxyFactory,
      ProxyFactory.abi,
      wallet
    );

    proxyFactory.once("ProxyCreation", async (proxyAddress: string) => {
      let stateChannel = StateChannel.setupChannel(
        network.FreeBalanceApp,
        proxyAddress,
        xkeys.map(x => x.neuter().extendedKey)
      ).setFreeBalance(
        createFreeBalanceStateWithFundedETHAmounts(
          multisigOwnerKeys.map<string>(key => key.address),
          parseEther("20")
        )
      );

      const freeBalanceETH = stateChannel.freeBalance;

      // target app instance
      const targetAppInstance = new AppInstance(
        stateChannel.multisigAddress, // ok
        // TODO: will not be ok when passed to installApp; need k-th signing keys
        stateChannel.multisigOwners, // ok
        0, // default timeout
        {
          // appInterface
          addr: twoPartyFixedOutcomeAppDefinition.address,
          stateEncoding: "uint256",
          actionEncoding: undefined
        },
        true, // virtual
        0, // app sequence number
        2, // latest state
        1, // latest versionNumber
        0, // latest timeout
        {
          playerAddrs: [AddressZero, AddressZero],
          amount: Zero
        },
        undefined
      );

      const beneficiaries: [string, string] = [
        Wallet.createRandom().address,
        Wallet.createRandom().address
      ];

      const agreement = {
        beneficiaries,
        capitalProvided: parseEther("10"),
        expiryBlock: (await provider.getBlockNumber()) + 1000
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

      await wallet.sendTransaction({
        to: proxyAddress,
        value: parseEther("10")
      });

      const commitment = new ConditionalTransaction(
        network, // network
        proxyAddress, // multisigAddress
        multisigOwnerKeys.map(x => x.address), // signing
        targetAppInstance.identityHash, // target
        freeBalanceETH.identityHash, // fb
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

    await proxyFactory.functions.createProxy(
      network.MinimumViableMultisig,
      new Interface(MinimumViableMultisig.abi).functions.setup.encode([
        multisigOwnerKeys.map(x => x.address)
      ]),
      { gasLimit: CREATE_PROXY_AND_SETUP_GAS }
    );
  });
});
