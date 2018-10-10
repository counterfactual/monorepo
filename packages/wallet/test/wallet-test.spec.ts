import * as ethers from "ethers";
import PaymentApp from "../contracts/build/contracts/PaymentApp.json";

import * as cf from "@counterfactual/cf.js";
import {
  InstallOptions,
  WalletMessaging,
  ClientActionMessage
} from "@counterfactual/machine/dist/types";
import { sleep } from "./common";
import {
  A_ADDRESS,
  A_PRIVATE_KEY,
  B_ADDRESS,
  B_PRIVATE_KEY,
  MULTISIG_ADDRESS,
  MULTISIG_PRIVATE_KEY
} from "./environment";
import { IframeWallet } from "../src/iframe_client/client";

const BALANCE_REFUND_STATE_ENCODING =
  "tuple(address recipient, address multisig, uint256 threshold)";
const PAYMENT_APP_STATE_ENCODING =
  "tuple(address alice, address bob, uint256 aliceBalance, uint256 bobBalance)";
const PAYMENT_APP_ABI_ENCODING = JSON.stringify(PaymentApp.abi);
const INSTALL_OPTIONS: InstallOptions = {
  appAddress: ethers.constants.AddressZero,
  peerABalance: ethers.utils.bigNumberify(0),
  peerBBalance: ethers.utils.bigNumberify(0),
  abiEncoding: PAYMENT_APP_ABI_ENCODING,
  stateEncoding: PAYMENT_APP_STATE_ENCODING,
  state: {
    alice: A_ADDRESS,
    bob: B_ADDRESS,
    aliceBalance: ethers.utils.bigNumberify(10),
    bobBalance: ethers.utils.bigNumberify(10)
  }
};

const blockchainProvider = new ethers.providers.JsonRpcProvider(
  process.env.GANACHE_URL
);

class ClientInterfaceBridge implements WalletMessaging {
  public client: IframeWallet;

  constructor(client: IframeWallet) {
    this.client = client;
  }

  public postMessage(message: ClientActionMessage, to: string) {
    // TODO move this into a setTimeout to enfore asyncness of the call
    this.client.receiveMessageFromClient(message);
  }

  public onMessage(userId: string, callback: Function) {
    this.client.onResponse(callback);
  }
}

let multisigContractAddress;

describe("Lifecycle", async () => {
  // extending the timeout to allow the async machines to finish
  jest.setTimeout(30000);

  let multisigContract;
  const owners = [A_ADDRESS, B_ADDRESS];
  beforeAll(async () => {
    const multisigWallet = new IframeWallet();
    multisigWallet.setUser(MULTISIG_ADDRESS, MULTISIG_PRIVATE_KEY);

    multisigContract = await IframeWallet.deployMultisig(
      multisigWallet.currentUser.ethersWallet,
      owners
    );
    expect(multisigContract.address).not.toBe(null);
    expect(await multisigContract.functions.getOwners()).toEqual(owners);
    multisigContractAddress = multisigContract.address;
  });

  let clientA: IframeWallet;
  let clientB: IframeWallet;
  let connectionA;
  let connectionB;
  let clientInterfaceA: cf.ClientInterface;
  let clientInterfaceB: cf.ClientInterface;
  beforeEach(async () => {
    clientA = new IframeWallet();
    clientB = new IframeWallet();
    clientA.setUser(A_ADDRESS, A_PRIVATE_KEY);
    clientB.setUser(B_ADDRESS, B_PRIVATE_KEY);
    connectionA = new ClientInterfaceBridge(clientA);
    connectionB = new ClientInterfaceBridge(clientB);
    clientInterfaceA = new cf.ClientInterface("some-user-id", connectionA);
    clientInterfaceB = new cf.ClientInterface("some-user-id", connectionB);
    await clientInterfaceA.init();
    await clientInterfaceB.init();

    clientA.currentUser.io.peer = clientB;
    clientB.currentUser.io.peer = clientA;
  });

  it("Can observe an installation of an app", async () => {
    // hasAssertions to ensure that the "installCompleted" observer fires
    expect.hasAssertions();

    const stateChannelA = await clientInterfaceA.setup(
      B_ADDRESS,
      multisigContractAddress
    );
    await clientInterfaceB.getOrCreateStateChannel(
      A_ADDRESS,
      multisigContractAddress
    );
    clientInterfaceB.addObserver("installCompleted", data => {
      expect(true).toBeTruthy();
    });
    await stateChannelA.install("paymentApp", INSTALL_OPTIONS);

    await sleep(50);
  });

  it("Can remove observers", async () => {
    // hasAssertions to ensure that the "installCompleted" observer fires
    expect.hasAssertions();

    const stateChannelA = await clientInterfaceA.setup(
      B_ADDRESS,
      multisigContractAddress
    );
    await clientInterfaceB.getOrCreateStateChannel(
      A_ADDRESS,
      multisigContractAddress
    );
    const falsyCallback = () => expect(false).toBeTruthy();
    clientInterfaceB.addObserver("installCompleted", data => {
      expect(true).toBeTruthy();
    });
    clientInterfaceB.addObserver("installCompleted", falsyCallback);
    clientInterfaceB.removeObserver("installCompleted", falsyCallback);
    await stateChannelA.install("paymentApp", INSTALL_OPTIONS);

    await sleep(50);
  });

  it("Will notify only the current user", async () => {
    // hasAssertions to ensure that the "installCompleted" observer fires
    expect.hasAssertions();

    const clientA = new IframeWallet();
    const clientB = new IframeWallet();
    clientA.setUser(A_ADDRESS, A_PRIVATE_KEY);
    clientB.setUser(B_ADDRESS, B_PRIVATE_KEY);
    const connectionA = new ClientInterfaceBridge(clientA);
    const connectionB = new ClientInterfaceBridge(clientB);
    const clientInterfaceA = new cf.ClientInterface(
      "some-user-id",
      connectionA
    );
    const clientInterfaceB = new cf.ClientInterface(
      "some-user-id",
      connectionB
    );

    clientInterfaceB.addObserver("installCompleted", data => {
      expect(false).toBeTruthy();
    });

    clientB.setUser(B_ADDRESS, B_PRIVATE_KEY);

    await clientInterfaceA.init();
    await clientInterfaceB.init();

    clientA.currentUser.io.peer = clientB;
    clientB.currentUser.io.peer = clientA;

    const stateChannelAB = await clientInterfaceA.setup(
      B_ADDRESS,
      multisigContractAddress
    );
    await clientInterfaceB.getOrCreateStateChannel(
      multisigContractAddress,
      A_ADDRESS
    );

    clientInterfaceB.addObserver("installCompleted", data => {
      expect(true).toBeTruthy();
    });

    await stateChannelAB.install("paymentApp", INSTALL_OPTIONS);

    await sleep(50);
  });

  it("Can deposit to a state channel", async () => {
    const amountA = ethers.utils.parseEther("5");
    const amountB = ethers.utils.parseEther("7");

    const stateChannelAB = await clientInterfaceA.setup(
      B_ADDRESS,
      multisigContractAddress
    );
    const stateChannelBA = clientInterfaceB.getOrCreateStateChannel(
      stateChannelAB.multisigAddress,
      A_ADDRESS
    );

    await stateChannelAB.deposit(
      clientA.network.ETHBalanceRefundApp.address,
      JSON.stringify(clientA.network.ETHBalanceRefundApp.abi),
      BALANCE_REFUND_STATE_ENCODING,
      amountA,
      ethers.utils.bigNumberify(0)
    );
    await validateDeposit(
      clientA,
      clientB,
      amountA,
      ethers.utils.bigNumberify(0)
    );
    await stateChannelBA.deposit(
      clientB.network.ETHBalanceRefundApp.address,
      JSON.stringify(clientB.network.ETHBalanceRefundApp.abi),
      BALANCE_REFUND_STATE_ENCODING,
      amountB,
      amountA
    );
    await validateDeposit(clientA, clientB, amountA, amountB);
  });

  it("Can install an app", async () => {
    const connection = new ClientInterfaceBridge(clientA);
    const client = new cf.ClientInterface("some-user-id", connection);
    await client.init();
    clientA.currentUser.io.peer = clientB;
    clientB.currentUser.io.peer = clientA;
    const threshold = 10;

    const stateChannel = await client.setup(B_ADDRESS, multisigContractAddress);
    await stateChannel.install("paymentApp", INSTALL_OPTIONS);

    await sleep(50);
    // check B's client
    validateInstalledBalanceRefund(clientB, threshold);
    // check A's client and return the newly created cf address
    validateInstalledBalanceRefund(clientA, threshold);
  });

  it("Can uninstall an app", async () => {
    const connection = new ClientInterfaceBridge(clientA);
    const client = new cf.ClientInterface("some-user-id", connection);
    await client.init();

    const stateChannel = await client.setup(B_ADDRESS, multisigContractAddress);
    const appChannel = await stateChannel.install(
      "paymentApp",
      INSTALL_OPTIONS
    );

    const uninstallAmountA = ethers.utils.bigNumberify(10);
    const uninstallAmountB = ethers.utils.bigNumberify(0);

    await appChannel.uninstall({
      peerABalance: uninstallAmountA,
      peerBBalance: uninstallAmountB
    });

    // validate clientA
    validateNoAppsAndFreeBalance(
      clientA,
      clientB,
      uninstallAmountA,
      uninstallAmountB
    );
    // validate clientB
    validateNoAppsAndFreeBalance(
      clientB,
      clientA,
      uninstallAmountB,
      uninstallAmountA
    );
  });

  it("Can update an app", async () => {
    const connection = new ClientInterfaceBridge(clientA);
    const client = new cf.ClientInterface("some-user-id", connection);
    await client.init();

    const stateChannel = await client.setup(B_ADDRESS, multisigContractAddress);
    const appChannel = await stateChannel.install(
      "paymentApp",
      INSTALL_OPTIONS
    );

    await makePayments(clientA, clientB, appChannel);
  });

  it("Can change users", async () => {
    const connection = new ClientInterfaceBridge(clientA);
    const client = new cf.ClientInterface("some-user-id", connection);
    await client.init();

    const threshold = 10;

    const stateChannel = await client.setup(B_ADDRESS, multisigContractAddress);
    await stateChannel.install("paymentApp", INSTALL_OPTIONS);

    await sleep(50);

    validateInstalledBalanceRefund(clientA, threshold);

    const C_ADDRESS = "0xB37ABb9F5CCc5Ce5f2694CE0720216B786cad61D";
    clientA.setUser(C_ADDRESS, A_PRIVATE_KEY);

    const state = clientA.currentUser.vm.cfState;
    expect(Object.keys(state.channelStates).length).toBe(0);

    clientA.setUser(A_ADDRESS, A_PRIVATE_KEY);

    validateInstalledBalanceRefund(clientA, threshold);
  });

  it("Can query freeBalance", async () => {
    const connection = new ClientInterfaceBridge(clientA);
    const client = new cf.ClientInterface("some-user-id", connection);
    await client.init();

    const stateChannel = await client.setup(B_ADDRESS, multisigContractAddress);
    await stateChannel.install("paymentApp", INSTALL_OPTIONS);
    const freeBalance = await stateChannel.queryFreeBalance();

    expect(freeBalance.data.freeBalance.aliceBalance.toNumber()).toBe(0);
    expect(freeBalance.data.freeBalance.bobBalance.toNumber()).toBe(0);
  });

  it("Can query stateChannel", async () => {
    const connection = new ClientInterfaceBridge(clientA);
    const clientInterfaceA = new cf.ClientInterface("some-user-id", connection);
    await clientInterfaceA.init();

    const stateChannelAB = await clientInterfaceA.setup(
      B_ADDRESS,
      multisigContractAddress
    );
    await stateChannelAB.install("paymentApp", INSTALL_OPTIONS);
    const stateChannelInfo = await stateChannelAB.queryStateChannel();

    expect(stateChannelInfo.data.stateChannel.counterParty).toBe(
      stateChannelAB.toAddress
    );
    expect(stateChannelInfo.data.stateChannel.me).toBe(
      stateChannelAB.fromAddress
    );
    expect(stateChannelInfo.data.stateChannel.multisigAddress).toBe(
      multisigContractAddress
    );
  });

  it("Allows apps to communicate directly with each other", async () => {
    const connectionA = new ClientInterfaceBridge(clientA);
    const clientInterfaceA = new cf.ClientInterface(
      "some-user-id",
      connectionA
    );
    clientA.onMessage(msg => {
      clientInterfaceA.sendIOMessage(msg);
    });
    clientB.onMessage(msg => {
      clientInterfaceB.sendIOMessage(msg);
    });

    clientInterfaceA.registerIOSendMessage(msg => {
      clientInterfaceB.receiveIOMessage(msg);
    });
    clientInterfaceB.registerIOSendMessage(msg => {
      clientInterfaceA.receiveIOMessage(msg);
    });

    await clientInterfaceA.init();
    await clientInterfaceB.init();

    const stateChannel = await clientInterfaceA.setup(
      B_ADDRESS,
      multisigContractAddress
    );
    await stateChannel.install("paymentApp", INSTALL_OPTIONS);

    const threshold = 10;

    await sleep(50);

    validateInstalledBalanceRefund(clientB, threshold);
    validateInstalledBalanceRefund(clientA, threshold);
  });
});

/**
 * Validates the correctness of clientA's free balance *not* clientB's.
 */
function validateNoAppsAndFreeBalance(
  clientA: IframeWallet,
  clientB: IframeWallet,
  amountA: ethers.utils.BigNumber,
  amountB: ethers.utils.BigNumber
) {
  // TODO: add nonce and uniqueId params and check them
  const state = clientA.currentUser.vm.cfState;

  let peerA = clientA.address;
  let peerB = clientB.address;
  if (peerB!.localeCompare(peerA!) < 0) {
    const tmp = peerA;
    peerA = peerB;
    peerB = tmp;
    const tmpAmount = amountA;
    amountA = amountB;
    amountB = tmpAmount;
  }

  const channel =
    clientA.currentUser.vm.cfState.channelStates[multisigContractAddress];
  expect(Object.keys(state.channelStates).length).toBe(1);
  expect(channel.counterParty).toBe(clientB.address);
  expect(channel.me).toBe(clientA.address);
  expect(channel.multisigAddress).toBe(multisigContractAddress);
  expect(channel.freeBalance.alice).toBe(peerA);
  expect(channel.freeBalance.bob).toBe(peerB);
  expect(channel.freeBalance.aliceBalance.toNumber()).toBe(amountA.toNumber());
  expect(channel.freeBalance.bobBalance.toNumber()).toBe(amountB.toNumber());

  Object.keys(channel.appChannels).forEach(appId => {
    expect(channel.appChannels[appId].dependencyNonce.nonceValue).toBe(2);
  });
}

function validateInstalledBalanceRefund(wallet: IframeWallet, amount: number) {
  const stateChannel =
    wallet.currentUser.vm.cfState.channelStates[multisigContractAddress];
  const appChannels = stateChannel.appChannels;
  const cfAddrs = Object.keys(appChannels);
  expect(cfAddrs.length).toBe(1);

  const cfAddr = cfAddrs[0];

  expect(appChannels[cfAddr].peerA.balance.toNumber()).toBe(0);
  expect(appChannels[cfAddr].peerA.address).toBe(
    stateChannel.freeBalance.alice
  );
  expect(appChannels[cfAddr].peerA.balance.toNumber()).toBe(0);

  expect(appChannels[cfAddr].peerB.balance.toNumber()).toBe(0);
  expect(appChannels[cfAddr].peerB.address).toBe(stateChannel.freeBalance.bob);
  expect(appChannels[cfAddr].peerB.balance.toNumber()).toBe(0);

  return cfAddr;
}

async function validateDeposit(
  clientA: IframeWallet,
  clientB: IframeWallet,
  amountA: ethers.utils.BigNumber,
  amountB: ethers.utils.BigNumber
) {
  await validateMultisigBalance(amountA, amountB);
  validateFreebalance(clientB, amountA, amountB);
  validateFreebalance(clientA, amountA, amountB);
}

async function validateMultisigBalance(
  aliceBalance: ethers.utils.BigNumber,
  bobBalance: ethers.utils.BigNumber
) {
  const multisigAmount = await blockchainProvider.getBalance(
    multisigContractAddress
  );
  expect(ethers.utils.bigNumberify(multisigAmount).toString()).toBe(
    aliceBalance.add(bobBalance).toString()
  );
}

function validateFreebalance(
  wallet: IframeWallet,
  aliceBalance: ethers.utils.BigNumber,
  bobBalance: ethers.utils.BigNumber
) {
  const stateChannel =
    wallet.currentUser.vm.cfState.channelStates[multisigContractAddress];
  const freeBalance = stateChannel.freeBalance;

  expect(freeBalance.aliceBalance.toString()).toBe(aliceBalance.toString());
  expect(freeBalance.bobBalance.toString()).toBe(bobBalance.toString());
}

async function makePayments(
  clientA: IframeWallet,
  clientB: IframeWallet,
  appChannel: cf.AppChannelClient
) {
  await makePayment(clientA, clientB, appChannel, "5", "15", 1);
  await makePayment(clientA, clientB, appChannel, "7", "12", 2);
  await makePayment(clientA, clientB, appChannel, "13", "6", 3);
  await makePayment(clientA, clientB, appChannel, "17", "2", 4);
  await makePayment(clientA, clientB, appChannel, "12", "8", 5);
}

async function makePayment(
  clientA: IframeWallet,
  clientB: IframeWallet,
  appChannel: cf.AppChannelClient,
  aliceBalance: string,
  bobBalance: string,
  totalUpdates: number
) {
  const newState = {
    ...INSTALL_OPTIONS.state,
    aliceBalance: ethers.utils.bigNumberify(aliceBalance),
    bobBalance: ethers.utils.bigNumberify(bobBalance)
  };

  await appChannel.update({ state: newState });
  validateUpdatePayment(clientA, clientB, appChannel, newState, totalUpdates);
}

function validateUpdatePayment(
  clientA: IframeWallet,
  clientB: IframeWallet,
  appChannel: cf.AppChannelClient,
  appState: object,
  totalUpdates: number
) {
  const appA =
    clientA.currentUser.vm.cfState.channelStates[multisigContractAddress]
      .appChannels[appChannel.appId];
  const appB =
    clientB.currentUser.vm.cfState.channelStates[multisigContractAddress]
      .appChannels[appChannel.appId];

  const encodedAppState = appChannel.appInterface.encode(appState);
  const appStateHash = appChannel.appInterface.stateHash(appState);

  expect(appA.encodedState).toBe(encodedAppState);
  expect(appA.appStateHash).toBe(appStateHash);
  expect(appA.localNonce).toBe(totalUpdates + 1);
  expect(appB.encodedState).toBe(encodedAppState);
  expect(appB.appStateHash).toBe(appStateHash);
  expect(appB.localNonce).toBe(totalUpdates + 1);
}
