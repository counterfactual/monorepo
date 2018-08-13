import {
  setupTestEnv,
  signMessageBytes,
  UNIT_ETH,
  ZERO_ADDRESS
} from "@counterfactual/test-utils";
import * as ethers from "ethers";

import {
  AbstractContract,
  AssetType,
  buildArtifacts,
  computeNonceRegistryKey,
  Multisig,
  StateChannel,
  structDefinitionToEncoding,
  TransferTerms
} from "../../utils";

const web3 = (global as any).web3;
const { provider, unlockedAccount: masterAccount } = setupTestEnv(web3);

const {
  Registry,
  NonceRegistry,
  ConditionalTransfer,
  StaticCall
} = buildArtifacts;

const [alice, bob] = [
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new ethers.Wallet(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27",
    provider
  ),
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new ethers.Wallet(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd",
    provider
  )
];

const { keccak256, parseEther } = ethers.utils;

function computeCommitHash(appSalt: string, chosenNumber: number) {
  return ethers.utils.solidityKeccak256(
    ["bytes32", "uint256"],
    [appSalt, chosenNumber]
  );
}

enum Stage {
  SETTING_MAX,
  CHOOSING,
  GUESSING,
  REVEALING,
  DONE
}

enum Player {
  CHOOSING = 0,
  GUESSING = 1
}

async function createMultisig() {
  const multisig = new Multisig([alice.address, bob.address]);
  await multisig.deploy(masterAccount);
  await masterAccount.sendTransaction({
    to: multisig.address,
    value: parseEther("2")
  });
  return multisig;
}

async function deployApp() {
  const CommitRevealApp = AbstractContract.loadBuildArtifact(
    "CommitRevealApp",
    { StaticCall }
  );

  const terms = {
    assetType: AssetType.ETH,
    limit: parseEther("2")
  };
  const appContract = await CommitRevealApp.deploy(masterAccount);
  const appStateEncoding = structDefinitionToEncoding(`
      address[2] playerAddrs;
      uint256 stage;
      uint256 maximum;
      uint256 guessedNumber;
      bytes32 commitHash;
      uint256 winner;
    `);
  return { terms, appContract, appStateEncoding };
}

async function deployStateChannel(
  multisig: Multisig,
  appContract: ethers.Contract,
  appStateEncoding: string,
  terms: TransferTerms
) {
  const registry = Registry.getDeployed(masterAccount);
  const stateChannel = new StateChannel(
    [alice.address, bob.address],
    multisig,
    appContract,
    appStateEncoding,
    terms
  );
  await stateChannel.deploy(masterAccount, registry);
  if (!stateChannel.contract) {
    throw new Error("Deploy failed");
  }
  return stateChannel;
}

async function setFinalizedChannelNonce(
  multisig: Multisig,
  channelNonce: number,
  channelNonceSalt: string
) {
  const nonceRegistry = NonceRegistry.getDeployed(masterAccount);
  await multisig.execCall(
    nonceRegistry,
    "setNonce",
    [channelNonceSalt, channelNonce],
    [alice, bob]
  );

  await multisig.execCall(
    nonceRegistry,
    "finalizeNonce",
    [channelNonceSalt],
    [alice, bob]
  );

  const channelNonceKey = computeNonceRegistryKey(
    multisig.address,
    channelNonceSalt
  );
  (await nonceRegistry.functions.isFinalized(
    channelNonceKey,
    channelNonce
  )).should.be.equal(true);
  return channelNonceKey;
}

async function executeStateChannelTransfer(
  stateChannel: StateChannel,
  multisig: Multisig,
  channelNonceKey: string,
  channelNonce: number
) {
  if (!stateChannel.contract) {
    throw new Error("Deploy failed");
  }
  const conditionalTransfer = ConditionalTransfer.getDeployed(masterAccount);
  const registry = Registry.getDeployed(masterAccount);
  const nonceRegistry = NonceRegistry.getDeployed(masterAccount);

  await multisig.execDelegatecall(
    conditionalTransfer,
    "executeStateChannelConditionalTransfer",
    [
      registry.address,
      nonceRegistry.address,
      channelNonceKey,
      channelNonce,
      stateChannel.contract.cfAddress,
      stateChannel.terms
    ],
    [alice, bob]
  );
}

describe("CommitReveal", async () => {
  it("should pay out to the winner", async function() {
    this.timeout(4000);

    const startBalanceA = await alice.getBalance();
    const startBalanceB = await bob.getBalance();

    // 1. Deploy & fund multisig
    const multisig = await createMultisig();

    // 2. Deploy CommitRevealApp app
    const { terms, appContract, appStateEncoding } = await deployApp();

    // 3. Deploy StateChannel
    const stateChannel = await deployStateChannel(
      multisig,
      appContract,
      appStateEncoding,
      terms
    );

    // 4. Call setState(claimFinal=true) on StateChannel with a final state
    const numberSalt =
      "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc94";

    const chosenNumber = 5;

    const commitHash = computeCommitHash(numberSalt, chosenNumber);

    const appState = {
      playerAddrs: [alice.address, bob.address],
      stage: Stage.DONE,
      maximum: 10,
      guessedNumber: 1,
      winner: Player.CHOOSING,
      commitHash
    };
    await stateChannel.setState(appState, [alice, bob]);

    // 5. Call setResolution() on StateChannel
    await stateChannel.setResolution(appState);

    // 6. Call setNonce on NonceRegistry with some salt and nonce
    const channelNonce = 1;
    const channelNonceSalt =
      "0x3004efe76b684aef3c1b29448e84d461ff211ddba19cdf75eb5e31eebbb6999b";

    const channelNonceKey = await setFinalizedChannelNonce(
      multisig,
      channelNonce,
      channelNonceSalt
    );
    // 7. Call executeStateChannelConditionalTransfer on ConditionalTransfer from multisig
    await executeStateChannelTransfer(
      stateChannel,
      multisig,
      channelNonceKey,
      channelNonce
    );

    // 8. Verify balance of A and B
    const endBalanceA = await alice.getBalance();
    const endBalanceB = await bob.getBalance();

    endBalanceA.sub(startBalanceA).should.be.bignumber.eq(parseEther("2"));
    endBalanceB.should.be.bignumber.eq(startBalanceB);
  });
});
