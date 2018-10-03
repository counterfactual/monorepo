import {
  generateEthWallets,
  mineBlocks,
  setupTestEnv,
  signMessage,
  UNIT_ETH,
  ZERO_ADDRESS
} from "@counterfactual/test-utils";
import * as ethers from "ethers";

import {
  abiEncodingForStruct,
  AbstractContract,
  AppInstance,
  AssetType,
  buildArtifacts,
  computeNonceRegistryKey,
  Multisig,
  TransferTerms
} from "../../utils";

const { web3 } = global as any;

const {
  Registry,
  NonceRegistry,
  ConditionalTransfer,
  StaticCall
} = buildArtifacts;

/// Returns the commit hash that can be used to commit to chosenNumber
/// using appSalt
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

const { parseEther } = ethers.utils;
const CommitRevealApp = AbstractContract.loadBuildArtifact("CommitRevealApp", {
  StaticCall
});

const { provider, unlockedAccount: masterAccount } = setupTestEnv(web3);
const appStateEncoding = abiEncodingForStruct(`
  address[2] playerAddrs;
  uint256 stage;
  uint256 maximum;
  uint256 guessedNumber;
  bytes32 commitHash;
  uint256 winner;
`);

async function createMultisig(
  sender: ethers.Wallet,
  initialFunding: ethers.BigNumber,
  owners: ethers.Wallet[]
): Promise<Multisig> {
  const multisig = new Multisig(owners.map(w => w.address));
  await multisig.deploy(sender);
  await sender.sendTransaction({
    to: multisig.address,
    value: initialFunding
  });
  return multisig;
}

async function deployApp(): Promise<ethers.Contract> {
  return CommitRevealApp.deploy(masterAccount);
}

async function deployStateChannel(
  multisig: Multisig,
  appContract: ethers.Contract,
  terms: TransferTerms
) {
  const registry = await Registry.getDeployed(masterAccount);
  const signers = multisig.owners; // TODO: generate new signing keys for each state channel
  const stateChannel = new AppInstance(
    signers,
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

/// Set channel nonce with key corresponding to (multisig.address, channelNonceSalt),
/// and then wait 10 blocks, hence finalizing the nonce.
async function setChannelNonceAndWait(
  multisig: Multisig,
  channelNonceValue: ethers.BigNumber,
  channelNonceSalt: string,
  signers: ethers.Wallet[]
) {
  const nonceRegistry = await NonceRegistry.getDeployed(masterAccount);
  await multisig.execCall(
    nonceRegistry,
    "setNonce",
    [new ethers.BigNumber(10), channelNonceSalt, channelNonceValue],
    signers
  );

  await mineBlocks(10);

  const channelNonceKey = computeNonceRegistryKey(
    new ethers.BigNumber(10),
    multisig.address,
    channelNonceSalt
  );
  (await nonceRegistry.functions.isFinalized(
    channelNonceKey,
    channelNonceValue
  )).should.be.equal(true);
  return channelNonceKey;
}

async function executeStateChannelTransfer(
  stateChannel: AppInstance,
  multisig: Multisig,
  channelNonceKey: string,
  channelNonceValue: ethers.BigNumber,
  signers: ethers.Wallet[]
) {
  if (!stateChannel.contract) {
    throw new Error("Deploy failed");
  }
  const conditionalTransfer = await ConditionalTransfer.getDeployed(
    masterAccount
  );
  const registry = await Registry.getDeployed(masterAccount);
  const nonceRegistry = await NonceRegistry.getDeployed(masterAccount);

  await multisig.execDelegatecall(
    conditionalTransfer,
    "executeAppConditionalTransfer",
    [
      registry.address,
      nonceRegistry.address,
      channelNonceKey,
      channelNonceValue,
      stateChannel.contract.cfAddress,
      stateChannel.terms
    ],
    signers
  );
}

describe("CommitReveal", async () => {
  it("should pay out to the winner", async function() {
    this.timeout(4000);

    const [alice, bob] = generateEthWallets(2, provider);

    // 1. Deploy & fund multisig
    const multisig = await createMultisig(masterAccount, parseEther("2"), [
      alice,
      bob
    ]);

    // 2. Deploy CommitRevealApp app
    const appContract = await deployApp();

    // 3. Deploy StateChannel
    const terms = {
      assetType: AssetType.ETH,
      limit: parseEther("2")
    };
    const stateChannel = await deployStateChannel(multisig, appContract, terms);

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

    // 6. Call setNonce on NonceRegistry. Salt is arbitrarily chosen.
    const channelNonceValue = new ethers.BigNumber(1);
    const channelNonceSalt =
      "0x3004efe76b684aef3c1b29448e84d461ff211ddba19cdf75eb5e31eebbb6999b";

    const channelNonceKey = await setChannelNonceAndWait(
      multisig,
      channelNonceValue,
      channelNonceSalt,
      [alice, bob]
    );

    // 7. Call executeStateChannelConditionalTransfer on ConditionalTransfer from multisig
    await executeStateChannelTransfer(
      stateChannel,
      multisig,
      channelNonceKey,
      channelNonceValue,
      [alice, bob]
    );

    // 8. Verify balance of A and B
    (await alice.getBalance()).should.be.bignumber.eq(parseEther("2"));
    (await bob.getBalance()).should.be.bignumber.eq(0);
  });
});
