import * as cf from "@counterfactual/cf.js";
import PaymentAppJson from "@counterfactual/contracts/build/contracts/PaymentApp.json";
import * as ethers from "ethers";

import { ganacheURL } from "../src/iframe/user";
import { IFrameWallet } from "../src/iframe/wallet";

import { EMPTY_NETWORK_CONTEXT } from "./common";
import {
  A_ADDRESS,
  A_PRIVATE_KEY,
  B_ADDRESS,
  B_PRIVATE_KEY
} from "./environment";

const PAYMENT_APP_STATE_ENCODING =
  "tuple(address alice, address bob, uint256 aliceBalance, uint256 bobBalance)";
const PAYMENT_APP_ABI_ENCODING = JSON.stringify(PaymentAppJson.abi);

const APP_NAME = "PaymentApp";
const APP_INSTANCE = new cf.AppInstance(
  [A_ADDRESS, B_ADDRESS].sort(),
  {
    address: ethers.constants.AddressZero,
    appActionEncoding: PAYMENT_APP_ABI_ENCODING,
    appStateEncoding: PAYMENT_APP_STATE_ENCODING
  },
  new cf.app.Terms(
    0,
    ethers.utils.bigNumberify(0),
    ethers.constants.AddressZero
  ),
  100
);
const APP_DEPOSITS: cf.types.Deposits = {
  [A_ADDRESS]: ethers.utils.bigNumberify(0),
  [B_ADDRESS]: ethers.utils.bigNumberify(0)
};
const APP_INITIAL_STATE = {
  alice: A_ADDRESS,
  bob: B_ADDRESS,
  aliceBalance: ethers.utils.bigNumberify(10),
  bobBalance: ethers.utils.bigNumberify(10)
};

const blockchainProvider = new ethers.providers.JsonRpcProvider(ganacheURL);

class ClientBridge implements cf.node.WalletMessaging {
  public client: IFrameWallet;

  constructor(client: IFrameWallet) {
    this.client = client;
  }

  public postMessage(message: cf.node.ClientActionMessage) {
    //  TODO: move this into a setTimeout to enfore asyncness of the call
    this.client.receiveMessageFromClient(message);
  }

  public onMessage(callback: Function) {
    this.client.onResponse(callback);
  }
}

describe("Lifecycle", async () => {
  // extending the timeout to allow the async machines to finish
  jest.setTimeout(30000);

  let clientA: IFrameWallet;
  let clientB: IFrameWallet;
  let connectionA;
  let connectionB;
  let clientInterfaceA: cf.Client;
  let clientInterfaceB: cf.Client;

  beforeEach(async () => {
    clientA = new IFrameWallet(EMPTY_NETWORK_CONTEXT);
    clientB = new IFrameWallet(EMPTY_NETWORK_CONTEXT);

    clientA.setUser(A_ADDRESS, A_PRIVATE_KEY);
    clientB.setUser(B_ADDRESS, B_PRIVATE_KEY);

    connectionA = new ClientBridge(clientA);
    connectionB = new ClientBridge(clientB);

    clientInterfaceA = new cf.Client(connectionA);
    clientInterfaceB = new cf.Client(connectionB);

    await clientInterfaceA.init();
    await clientInterfaceB.init();

    clientA.currentUser.io.peer = clientB;
    clientB.currentUser.io.peer = clientA;
  });

  it("Can observe an installation of an app", async () => {
    // hasAssertions to ensure that the "installCompleted" observer fires
    expect.hasAssertions();

    const stateChannelA = await clientInterfaceA.connect(B_ADDRESS);
    await clientInterfaceB.connect(A_ADDRESS);
    clientInterfaceB.addObserver("installCompleted", data => {
      expect(true).toBeTruthy();
    });
    await stateChannelA.install(
      APP_NAME,
      APP_INSTANCE,
      APP_DEPOSITS,
      APP_INITIAL_STATE
    );
  });

  it("Can remove observers", async () => {
    // hasAssertions to ensure that the "installCompleted" observer fires
    expect.hasAssertions();

    const stateChannelA = await clientInterfaceA.connect(B_ADDRESS);
    await clientInterfaceB.connect(A_ADDRESS);
    const falsyCallback = () => expect(false).toBeTruthy();
    clientInterfaceB.addObserver("installCompleted", data => {
      expect(true).toBeTruthy();
    });
    clientInterfaceB.addObserver("installCompleted", falsyCallback);
    clientInterfaceB.removeObserver("installCompleted", falsyCallback);
    await stateChannelA.install(
      APP_NAME,
      APP_INSTANCE,
      APP_DEPOSITS,
      APP_INITIAL_STATE
    );
  });

  it("Will notify only the current user", async () => {
    // hasAssertions to ensure that the "installCompleted" observer fires
    expect.hasAssertions();

    const clientA = new IFrameWallet(EMPTY_NETWORK_CONTEXT);
    const clientB = new IFrameWallet(EMPTY_NETWORK_CONTEXT);
    clientA.setUser(A_ADDRESS, A_PRIVATE_KEY);
    clientB.setUser(B_ADDRESS, B_PRIVATE_KEY);
    const connectionA = new ClientBridge(clientA);
    const connectionB = new ClientBridge(clientB);
    const clientInterfaceA = new cf.Client(connectionA);
    const clientInterfaceB = new cf.Client(connectionB);

    clientInterfaceB.addObserver("installCompleted", data => {
      expect(false).toBeTruthy();
    });

    clientB.setUser(B_ADDRESS, B_PRIVATE_KEY);

    await clientInterfaceA.init();
    await clientInterfaceB.init();

    clientA.currentUser.io.peer = clientB;
    clientB.currentUser.io.peer = clientA;

    const stateChannelAB = await clientInterfaceA.connect(B_ADDRESS);
    await clientInterfaceB.connect(A_ADDRESS);

    clientInterfaceB.addObserver("installCompleted", data => {
      expect(true).toBeTruthy();
    });

    await stateChannelAB.install(
      APP_NAME,
      APP_INSTANCE,
      APP_DEPOSITS,
      APP_INITIAL_STATE
    );
  });

  it("Can deposit to a state channel", async () => {
    const amountA = ethers.utils.parseEther("5");
    const amountB = ethers.utils.parseEther("7");

    const stateChannelAB = await clientInterfaceA.connect(B_ADDRESS);
    const stateChannelBA = await clientInterfaceB.connect(A_ADDRESS);

    await stateChannelAB.deposit(
      clientA.network.ethBalanceRefundAppAddr,
      amountA,
      ethers.utils.bigNumberify(0)
    );

    await validateDeposit(
      clientA,
      clientB,
      amountA,
      ethers.utils.bigNumberify(0),
      stateChannelAB.multisigAddress
    );

    await stateChannelBA.deposit(
      clientB.network.ethBalanceRefundAppAddr,
      amountB,
      amountA
    );

    await validateDeposit(
      clientA,
      clientB,
      amountA,
      amountB,
      stateChannelAB.multisigAddress
    );
  });

  it("Can install an app", async () => {
    const connection = new ClientBridge(clientA);
    const client = new cf.Client(connection);
    await client.init();
    clientA.currentUser.io.peer = clientB;
    clientB.currentUser.io.peer = clientA;
    const threshold = 10;

    const stateChannel = await client.connect(B_ADDRESS);
    await stateChannel.install(
      APP_NAME,
      APP_INSTANCE,
      APP_DEPOSITS,
      APP_INITIAL_STATE
    );
    // check B's client
    validateInstalledBalanceRefund(
      clientB,
      threshold,
      stateChannel.multisigAddress
    );
    // check A's client and return the newly created cf address
    validateInstalledBalanceRefund(
      clientA,
      threshold,
      stateChannel.multisigAddress
    );
  });

  it("Can uninstall an app", async () => {
    const connection = new ClientBridge(clientA);
    const client = new cf.Client(connection);
    await client.init();

    const stateChannel = await client.connect(B_ADDRESS);
    const appChannel = await stateChannel.install(
      APP_NAME,
      APP_INSTANCE,
      APP_DEPOSITS,
      APP_INITIAL_STATE
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
      uninstallAmountB,
      stateChannel.multisigAddress
    );
    // validate clientB
    validateNoAppsAndFreeBalance(
      clientB,
      clientA,
      uninstallAmountB,
      uninstallAmountA,
      stateChannel.multisigAddress
    );
  });

  it("Can update an app", async () => {
    const connection = new ClientBridge(clientA);
    const client = new cf.Client(connection);
    await client.init();

    const stateChannel = await client.connect(B_ADDRESS);
    const appChannel = await stateChannel.install(
      APP_NAME,
      APP_INSTANCE,
      APP_DEPOSITS,
      APP_INITIAL_STATE
    );

    await makePayments(
      clientA,
      clientB,
      appChannel,
      stateChannel.multisigAddress
    );
  });

  it("Can change users", async () => {
    const connection = new ClientBridge(clientA);
    const client = new cf.Client(connection);
    await client.init();

    const threshold = 10;

    const stateChannel = await client.connect(B_ADDRESS);
    await stateChannel.install(
      APP_NAME,
      APP_INSTANCE,
      APP_DEPOSITS,
      APP_INITIAL_STATE
    );

    validateInstalledBalanceRefund(
      clientA,
      threshold,
      stateChannel.multisigAddress
    );

    const C_ADDRESS = "0xB37ABb9F5CCc5Ce5f2694CE0720216B786cad61D";
    clientA.setUser(C_ADDRESS, A_PRIVATE_KEY);

    const state = clientA.currentUser.instructionExecutor.state;
    expect(Object.keys(state.channelStates).length).toBe(0);

    clientA.setUser(A_ADDRESS, A_PRIVATE_KEY);

    validateInstalledBalanceRefund(
      clientA,
      threshold,
      stateChannel.multisigAddress
    );
  });

  it("Can query freeBalance", async () => {
    const connection = new ClientBridge(clientA);
    const client = new cf.Client(connection);
    await client.init();

    const stateChannel = await client.connect(B_ADDRESS);
    await stateChannel.install(
      APP_NAME,
      APP_INSTANCE,
      APP_DEPOSITS,
      APP_INITIAL_STATE
    );
    const freeBalance = await stateChannel.queryFreeBalance();

    expect(freeBalance.data.freeBalance.aliceBalance.toNumber()).toBe(0);
    expect(freeBalance.data.freeBalance.bobBalance.toNumber()).toBe(0);
  });

  it("Can query stateChannel", async () => {
    const connection = new ClientBridge(clientA);
    const clientInterfaceA = new cf.Client(connection);
    await clientInterfaceA.init();

    const stateChannelAB = await clientInterfaceA.connect(B_ADDRESS);
    await stateChannelAB.install(
      APP_NAME,
      APP_INSTANCE,
      APP_DEPOSITS,
      APP_INITIAL_STATE
    );
    const stateChannelInfo = await stateChannelAB.queryStateChannel();

    expect(stateChannelInfo.data.stateChannel.counterParty).toBe(
      stateChannelAB.toAddress
    );
    expect(stateChannelInfo.data.stateChannel.me).toBe(
      stateChannelAB.fromAddress
    );
    expect(stateChannelInfo.data.stateChannel.multisigAddress).toBe(
      stateChannelAB.multisigAddress
    );
  });

  it("Allows apps to communicate directly with each other", async () => {
    const connectionA = new ClientBridge(clientA);
    const clientInterfaceA = new cf.Client(connectionA);
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

    const stateChannel = await clientInterfaceA.connect(B_ADDRESS);
    await stateChannel.install(
      APP_NAME,
      APP_INSTANCE,
      APP_DEPOSITS,
      APP_INITIAL_STATE
    );

    const threshold = 10;

    validateInstalledBalanceRefund(
      clientB,
      threshold,
      stateChannel.multisigAddress
    );
    validateInstalledBalanceRefund(
      clientA,
      threshold,
      stateChannel.multisigAddress
    );
  });
});

/**
 * Validates the correctness of clientA's free balance *not* clientB's.
 */
function validateNoAppsAndFreeBalance(
  clientA: IFrameWallet,
  clientB: IFrameWallet,
  amountAgiven: ethers.utils.BigNumber,
  amountBgiven: ethers.utils.BigNumber,
  multisigContractAddress: string
) {
  // TODO: add nonce and uniqueId params and check them
  const state = clientA.currentUser.instructionExecutor.state;

  let peerA = clientA.address;
  let peerB = clientB.address;

  let amountA = amountAgiven;
  let amountB = amountBgiven;

  if (peerB!.localeCompare(peerA!) < 0) {
    const tmp = peerA;
    peerA = peerB;
    peerB = tmp;
    const tmpAmount = amountA;
    amountA = amountB;
    amountB = tmpAmount;
  }

  const channel =
    clientA.currentUser.instructionExecutor.state.channelStates[multisigContractAddress];
  expect(Object.keys(state.channelStates).length).toBe(1);
  expect(channel.counterParty).toBe(clientB.address);
  expect(channel.me).toBe(clientA.address);
  expect(channel.multisigAddress).toBe(multisigContractAddress);
  expect(channel.freeBalance.alice).toBe(peerA);
  expect(channel.freeBalance.bob).toBe(peerB);
  expect(channel.freeBalance.aliceBalance.toNumber()).toBe(amountA.toNumber());
  expect(channel.freeBalance.bobBalance.toNumber()).toBe(amountB.toNumber());

  Object.keys(channel.appInstances).forEach(appId => {
    expect(channel.appInstances[appId].dependencyNonce.nonceValue).toBe(1);
  });
}

function validateInstalledBalanceRefund(
  wallet: IFrameWallet,
  amount: number,
  multisigContractAddress: string
) {
  const stateChannel =
    wallet.currentUser.instructionExecutor.state.channelStates[multisigContractAddress];
  const appInstances = stateChannel.appInstances;
  const cfAddrs = Object.keys(appInstances);
  expect(cfAddrs.length).toBe(1);

  const cfAddr = cfAddrs[0];

  expect(appInstances[cfAddr].peerA.balance.toNumber()).toBe(0);
  expect(appInstances[cfAddr].peerA.address).toBe(
    stateChannel.freeBalance.alice
  );
  expect(appInstances[cfAddr].peerA.balance.toNumber()).toBe(0);

  expect(appInstances[cfAddr].peerB.balance.toNumber()).toBe(0);
  expect(appInstances[cfAddr].peerB.address).toBe(stateChannel.freeBalance.bob);
  expect(appInstances[cfAddr].peerB.balance.toNumber()).toBe(0);

  return cfAddr;
}

async function validateDeposit(
  clientA: IFrameWallet,
  clientB: IFrameWallet,
  amountA: ethers.utils.BigNumber,
  amountB: ethers.utils.BigNumber,
  multisigContractAddress: string
) {
  await validateMultisigBalance(amountA, amountB, multisigContractAddress);
  validateFreebalance(clientB, amountA, amountB, multisigContractAddress);
  validateFreebalance(clientA, amountA, amountB, multisigContractAddress);
}

async function validateMultisigBalance(
  aliceBalance: ethers.utils.BigNumber,
  bobBalance: ethers.utils.BigNumber,
  multisigContractAddress: string
) {
  const multisigAmount = await blockchainProvider.getBalance(
    multisigContractAddress
  );
  expect(ethers.utils.bigNumberify(multisigAmount).toString()).toBe(
    aliceBalance.add(bobBalance).toString()
  );
}

function validateFreebalance(
  wallet: IFrameWallet,
  aliceBalance: ethers.utils.BigNumber,
  bobBalance: ethers.utils.BigNumber,
  multisigContractAddress: string
) {
  const stateChannel =
    wallet.currentUser.instructionExecutor.state.channelStates[multisigContractAddress];
  const freeBalance = stateChannel.freeBalance;

  expect(freeBalance.aliceBalance.toString()).toBe(aliceBalance.toString());
  expect(freeBalance.bobBalance.toString()).toBe(bobBalance.toString());
}

async function makePayments(
  clientA: IFrameWallet,
  clientB: IFrameWallet,
  appChannel: cf.AppChannelClient,
  multisigContractAddress: string
) {
  await makePayment(
    multisigContractAddress,
    clientA,
    clientB,
    appChannel,
    "5",
    "15",
    1
  );
  await makePayment(
    multisigContractAddress,
    clientA,
    clientB,
    appChannel,
    "7",
    "12",
    2
  );
  await makePayment(
    multisigContractAddress,
    clientA,
    clientB,
    appChannel,
    "13",
    "6",
    3
  );
  await makePayment(
    multisigContractAddress,
    clientA,
    clientB,
    appChannel,
    "17",
    "2",
    4
  );
  await makePayment(
    multisigContractAddress,
    clientA,
    clientB,
    appChannel,
    "12",
    "8",
    5
  );
}

async function makePayment(
  multisigContractAddress: string,
  clientA: IFrameWallet,
  clientB: IFrameWallet,
  appChannel: cf.AppChannelClient,
  aliceBalance: string,
  bobBalance: string,
  totalUpdates: number
) {
  const newState = {
    ...APP_INITIAL_STATE,
    aliceBalance: ethers.utils.bigNumberify(aliceBalance),
    bobBalance: ethers.utils.bigNumberify(bobBalance)
  };

  await appChannel.update({ state: newState });
  validateUpdatePayment(
    clientA,
    clientB,
    appChannel,
    newState,
    totalUpdates,
    multisigContractAddress
  );
}

function validateUpdatePayment(
  clientA: IFrameWallet,
  clientB: IFrameWallet,
  appChannel: cf.AppChannelClient,
  appState: object,
  totalUpdates: number,
  multisigContractAddress: string
) {
  const appA =
    clientA.currentUser.instructionExecutor.state.channelStates[multisigContractAddress]
      .appInstances[appChannel.appId];
  const appB =
    clientB.currentUser.instructionExecutor.state.channelStates[multisigContractAddress]
      .appInstances[appChannel.appId];

  const encodedAppState = appChannel.appInterface.encode(appState);
  const appStateHash = appChannel.appInterface.stateHash(appState);

  expect(appA.encodedState).toBe(encodedAppState);
  expect(appA.appStateHash).toBe(appStateHash);
  expect(appA.localNonce).toBe(totalUpdates + 1);
  expect(appB.encodedState).toBe(encodedAppState);
  expect(appB.appStateHash).toBe(appStateHash);
  expect(appB.localNonce).toBe(totalUpdates + 1);
}
