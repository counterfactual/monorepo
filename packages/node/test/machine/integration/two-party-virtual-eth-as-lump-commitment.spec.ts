import ChallengeRegistry from "@counterfactual/contracts/build/ChallengeRegistry.json";
import MinimumViableMultisig from "@counterfactual/contracts/build/MinimumViableMultisig.json";
import ProxyFactory from "@counterfactual/contracts/build/ProxyFactory.json";
import TwoPartyFixedOutcomeApp from "@counterfactual/contracts/build/TwoPartyFixedOutcomeApp.json";
import { NetworkContext } from "@counterfactual/types";
import { Contract, ContractFactory, Wallet } from "ethers";
import { AddressZero, HashZero, Zero } from "ethers/constants";
import { JsonRpcProvider } from "ethers/providers";
import { BigNumber, Interface, parseEther } from "ethers/utils";

import { SetStateCommitment } from "../../../src/ethereum";
import { TwoPartyVirtualEthAsLumpCommitment } from "../../../src/ethereum/two-party-virtual-eth-as-lump-commitment";
import { xkeysToSortedKthSigningKeys } from "../../../src/machine/xkeys";
import { AppInstance, StateChannel } from "../../../src/models";
import { createFundedFreeBalance } from "../../integration/utils";

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
let network: NetworkContext;
let appRegistry: Contract;

expect.extend({ toBeEq });

beforeAll(async () => {
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
      const stateChannel = StateChannel.setupChannel(
        network.ETHBucket,
        proxyAddress,
        xkeys.map(x => x.neuter().extendedKey)
      ).setFreeBalance(
        createFundedFreeBalance(
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
          stateEncoding: "",
          actionEncoding: undefined
        },
        true, // virtual
        0, // app sequence number
        {}, // latest state
        1, // latest versionNumber
        0, // latest timeout
        {
          playerAddrs: [AddressZero, AddressZero],
          amount: Zero
        },
        undefined
      );

      const beneficiaries = [
        Wallet.createRandom().address,
        Wallet.createRandom().address
      ];

      const commitment = new TwoPartyVirtualEthAsLumpCommitment(
        network, // network
        proxyAddress, // multisigAddress
        multisigOwnerKeys.map(x => x.address), // signing
        targetAppInstance.identityHash, // target
        freeBalanceETH.identity, // fb AI
        freeBalanceETH.hashOfLatestState, // fb state hash
        freeBalanceETH.versionNumber, // fb versionNumber
        freeBalanceETH.timeout, // fb timeout
        0, // dependency nonce
        new BigNumber(0), // expiry
        new BigNumber(10), // 10 wei
        beneficiaries, // beneficiaries
        HashZero
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

      await appRegistry.functions.setOutcome(
        targetAppInstance.identity,
        targetAppInstance.encodedLatestState
      );

      await wallet.sendTransaction({
        to: proxyAddress,
        value: parseEther("10")
      });

      await wallet.sendTransaction({
        ...commitment.getSignedTransaction([
          multisigOwnerKeys[0].signDigest(commitment.hashToSign()),
          multisigOwnerKeys[1].signDigest(commitment.hashToSign())
        ]),
        gasLimit: SETSTATE_COMMITMENT_GAS
      });

      expect(await provider.getBalance(beneficiaries[0])).toBeEq(5);
      expect(await provider.getBalance(beneficiaries[1])).toBeEq(5);

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
