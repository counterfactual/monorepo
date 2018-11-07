import { expect } from "chai";
import { ethers } from "ethers";

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
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

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
const commitRevealAppDefinition = AbstractContract.fromArtifactName(
  "CommitRevealApp",
  {
    StaticCall
  }
);

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

async function deployAppDefinition(): Promise<ethers.Contract> {
  return (await commitRevealAppDefinition).deploy(unlockedAccount);
}

async function deployAppInstance(
  multisig: Multisig,
  appContract: ethers.Contract,
  terms: TransferTerms
) {
  const registry = await (await Registry).getDeployed(unlockedAccount);
  const signers = multisig.owners;
  const appInstance = new AppInstance(
    signers,
    multisig,
    appContract,
    appStateEncoding,
    terms
  );
  await appInstance.deploy(unlockedAccount, registry);
  if (!appInstance.contract) {
    throw new Error("Deploy failed");
  }
  return appInstance;
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
    unlockedAccount
  );
  const registry = await (await Registry).getDeployed(unlockedAccount);
  const nonceRegistry = await (await NonceRegistry).getDeployed(
    unlockedAccount
  );

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

    const [alice, bob] = Utils.generateEthWallets(2, provider);

    // 1. Deploy & fund multisig
    const multisig = await createMultisig(unlockedAccount, parseEther("2"), [
      alice,
      bob
    ]);

    // 2. Deploy CommitRevealApp AppDefinition
    const appContract = await deployAppDefinition();

    // 3. Deploy StateChannel
    const terms = {
      assetType: AssetType.ETH,
      limit: parseEther("2")
    };
    const stateChannel = await deployAppInstance(multisig, appContract, terms);

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
