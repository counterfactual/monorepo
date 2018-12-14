import { expect } from "chai";
import { Contract, ContractFactory } from "ethers";
import { AddressZero, HashZero } from "ethers/constants";
import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { hexlify, randomBytes } from "ethers/utils";

import { ALICE, BOB } from "./constants";
import { AppInstance, AppInterface, AssetType, Terms } from "./utils";

const provider = new Web3Provider((global as any).web3.currentProvider);

contract("AppRegistry - Counterparty is Unresponsive", (accounts: string[]) => {
  let unlockedAccount: JsonRpcSigner;
  let appRegistry: Contract;

  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    const artifact = artifacts.require("AppRegistry");
    artifact.link(artifacts.require("LibStaticCall"));
    artifact.link(artifacts.require("Transfer"));

    appRegistry = await await new ContractFactory(
      artifact.abi,
      artifact.binary,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    await appRegistry.deployed();
  });

  it("is possible to call setState to put state on-chain", async () => {
    // Test AppInterface
    const appInterface = new AppInterface(
      AddressZero,
      hexlify(randomBytes(4)),
      hexlify(randomBytes(4)),
      hexlify(randomBytes(4)),
      hexlify(randomBytes(4))
    );

    // Test Terms
    const terms = new Terms(AssetType.ETH, 0, AddressZero);

    // Setup AppInstance
    const appInstance = new AppInstance(
      accounts[0],
      [ALICE.address, BOB.address],
      appInterface,
      terms,
      10
    );

    // Tell the AppRegistry to start timer
    await appRegistry.functions.setState(appInstance.appIdentity, {
      stateHash: hexlify(randomBytes(32)),
      nonce: 1,
      timeout: 10,
      signatures: HashZero
    });

    // Verify the correct data was put on-chain
    const {
      status,
      latestSubmitter,
      appStateHash,
      disputeCounter,
      disputeNonce,
      finalizesAt,
      nonce
    } = await appRegistry.functions.appStates(appInstance.id);

    console.log({
      status,
      latestSubmitter,
      appStateHash,
      disputeCounter,
      disputeNonce,
      finalizesAt,
      nonce
    });

    expect(status).to.be.eq(1);
  });
});
