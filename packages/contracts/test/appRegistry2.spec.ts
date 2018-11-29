import { expect } from "chai";
import { ethers } from "ethers";

import { AppInstance, AppInterface, AssetType, Terms } from "../src/index";

import { ALICE, BOB } from "./test-constants";

const APP_REGISTRY = artifacts.require("AppRegistry");

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

contract("AppRegistry - Counterparty is Unresponsive", (accounts: string[]) => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;
  let appRegistry: ethers.Contract;

  beforeEach(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);
    appRegistry = new ethers.Contract(
      APP_REGISTRY.address,
      APP_REGISTRY.abi,
      unlockedAccount
    );
  });

  it("is possible to call setState to put state on-chain", async () => {
    // Test AppInterface
    const appInterface = new AppInterface(
      ethers.constants.AddressZero,
      ethers.utils.hexlify(ethers.utils.randomBytes(4)),
      ethers.utils.hexlify(ethers.utils.randomBytes(4)),
      ethers.utils.hexlify(ethers.utils.randomBytes(4)),
      ethers.utils.hexlify(ethers.utils.randomBytes(4))
    );

    // Test Terms
    const terms = new Terms(AssetType.ETH, 0, ethers.constants.AddressZero);

    // Setup AppInstance
    const appInstance = new AppInstance(
      accounts[0],
      [ALICE.address, BOB.address],
      appInterface,
      terms,
      10
    );

    // Tell the AppRegistry to start timer
    await appRegistry.functions.setState(appInstance.appIdentity.toJson(), {
      stateHash: ethers.utils.hexlify(ethers.utils.randomBytes(32)),
      nonce: 1,
      timeout: 10,
      signatures: ethers.constants.HashZero
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
