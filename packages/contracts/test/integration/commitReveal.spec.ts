import { generateEthWallets, mineBlocks, setupTestEnv } from "../../utils/misc";
import { expect } from "chai";
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
  ConditionalTransaction,
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
const commitRevealApp = AbstractContract.loadBuildArtifact("CommitRevealApp", {
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
  initialFunding: ethers.utils.BigNumber,
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
  return (await commitRevealApp).deploy(masterAccount);
}

async function deployStateChannel(
  multisig: Multisig,
  appContract: ethers.Contract,
  terms: TransferTerms
) {
  const registry = await (await Registry).getDeployed(masterAccount);
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

async function executeStateChannelTransaction(
  stateChannel: AppInstance,
  multisig: Multisig,
  uninstallNonceKey: string,
  signers: ethers.Wallet[]
) {
  if (!stateChannel.contract) {
    throw new Error("Deploy failed");
  }
  const conditionalTransaction = await (await ConditionalTransaction).getDeployed(
    masterAccount
  );
  const registry = await (await Registry).getDeployed(masterAccount);
  const nonceRegistry = await (await NonceRegistry).getDeployed(masterAccount);

  await multisig.execDelegatecall(
    conditionalTransaction,
    "executeAppConditionalTransaction",
    [
      registry.address,
      nonceRegistry.address,
      uninstallNonceKey,
      stateChannel.contract.cfAddress,
      stateChannel.terms
    ],
    signers
  );
}

describe("CommitReveal", async () => {
  it("should pay out to the winner", async function() {
    // @ts-ignore
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
      commitHash,
      playerAddrs: [alice.address, bob.address],
      stage: Stage.DONE,
      maximum: 10,
      guessedNumber: 1,
      winner: Player.CHOOSING
    };
    await stateChannel.setState(appState, [alice, bob]);

    // 5. Call setResolution() on StateChannel
    await stateChannel.setResolution(appState);

    // 6. Compute channel nonce key
    // TODO: @scalefree Document source of this string.
    const channelNonceSalt =
      "0x3004efe76b684aef3c1b29448e84d461ff211ddba19cdf75eb5e31eebbb6999b";

    const channelNonceKey = computeNonceRegistryKey(
      new ethers.utils.BigNumber(0),
      multisig.address,
      channelNonceSalt
    );

    // 7. Call executeStateChannelConditionalTransaction on ConditionalTransaction from multisig
    await executeStateChannelTransaction(
      stateChannel,
      multisig,
      channelNonceKey,
      [alice, bob]
    );

    // 8. Verify balance of A and B
    expect((await alice.getBalance()).toString()).to.eql(
      parseEther("2").toString()
    );
    expect((await bob.getBalance()).toString()).to.eql(
      parseEther("0").toString()
    );
  });
});
