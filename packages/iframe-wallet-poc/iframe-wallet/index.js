let iframeWallet;

fetch("../../../node_modules/@counterfactual/contracts/networks/7777777.json")
  .then(function(response) {
    return response.json();
  })
  .then(function(myJson) {
    const networkContext = counterfactualWallet.IFrameWallet.networkFileToNetworkContext(
      myJson
    );
    iframeWallet = new counterfactualWallet.IFrameWallet(networkContext);
    console.log(`📄 Fetched development mode network context!`);
  });

const listeners = [];

let ethmoContract;
let multisigContract;
let nonceRegistry;
let registry;

const GAS_LIMITS = {
  DEPLOY_APP_INSTANCE: 4e6,
  SET_STATE_COMMITMENT: 0.5e6,
  INSTALL_COMMITMENT: 0.5e6
};

window.addEventListener("message", event => {
  if (event.data.type === "cf:init") {
    injectScript(event);
  }
});

async function getSourceCode(id) {
  const response = await fetch(document.getElementById(`${id}_src`).src);
  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let file = "";
  let done = false;

  while (!done) {
    const segment = await reader.read();
    file += decoder.decode(segment.value);
    done = segment.done;
  }

  return file.replace(`var ${id} =`, `window.${id} =`);
}

async function injectScript(event) {
  const injectedMachineScript = `${await getSourceCode("machine")};`;
  const injectedClientInterfaceScript = `${await getSourceCode("ci")};`;
  const injectedWalletScript = `${await getSourceCode(
    "counterfactualWallet"
  )};`;

  event.source.postMessage(
    { type: "cf:init-reply", source: injectedMachineScript },
    "*"
  );
  event.source.postMessage(
    { type: "cf:init-reply", source: injectedClientInterfaceScript },
    "*"
  );
  event.source.postMessage(
    { type: "cf:init-reply", source: injectedWalletScript },
    "*"
  );

  /**
   * Injects contract addresses into the app. These addresses can then be used
   * as the `address` property of an `AppDefinition`, which can be provided to the
   * ChannelInterface to install an app.
   *
   * @event cf:inject-address
   */
  event.source.postMessage(
    {
      type: "cf:inject-address",
      addresses: {
        PaymentApp: iframeWallet.network.paymentAppAddr,
        ETHBalanceRefundApp: iframeWallet.network.ethBalanceRefundAppAddr
      }
    },
    "*"
  );
}

function sendMessageToChild(msg) {
  document.querySelectorAll("iframe").forEach(el => {
    el.contentWindow.postMessage(msg, "*");
  });
}

async function pickUser(pkey) {
  // TODO: Figure out a way to access process.env within rollup and use `test/constants.ts`
  // currently can't rollup envvars: https://github.com/calvinmetcalf/rollup-plugin-node-globals/issues/7
  const key = new ethers.Wallet(pkey).address;

  iframeWallet.setUser(key, pkey);

  await iframeWallet.initUser(key);

  iframeWallet.onMessage(msg => {
    const message = {
      type: "cf:io-send",
      data: msg
    };
    sendMessageToChild(message);
  });

  iframeWallet.onResponse(message => {
    console.log("onResponse", message);
    sendMessageToChild(message);
  });

  listeners.forEach(listener =>
    window.removeEventListener("message", listener)
  );

  const listener = event => {
    if (event.data.type === "cf:default") {
      iframeWallet.receiveMessageFromClient(event.data);
    }
  };

  listeners.push(listener);

  window.addEventListener("message", listener);

  sendMessageToChild({ type: "cf:user-picked", key, pkey });
}

function getApps() {
  const openChannelAddress = Object.keys(
    iframeWallet.currentUser.vm.state.channelStates
  )[0];
<<<<<<< HEAD
  return iframeWallet.currentUser.vm.state.channelStates[openChannelAddress]
    .appChannels;
=======
  return iframeWallet.currentUser.vm.cfState.channelStates[openChannelAddress]
    .appInstances;
>>>>>>> master
}

function getStateChannels() {
  return iframeWallet.currentUser.vm.state.channelStates;
}

async function deployFreeBalanceStateChannel() {
  const stateChannels = getStateChannels();
  const stateChannel = Object.values(stateChannels)[0];
  const contract = await deployFreeBalanceContract(
    iframeWallet.networkContext,
    stateChannel,
    iframeWallet.currentUser.ethersWallet
  );
  console.log(`📄 FreeBalance contract deployed: ${contract.address}`);
}

async function deployEthmoStateChannel() {
  const apps = getApps();
  const ethmoApplication = Object.values(apps)[0];
  const stateChannels = getStateChannels();
  const stateChannel = Object.values(stateChannels)[0];
  ethmoContract = await deployApplicationStateChannel(
    iframeWallet.networkContext,
    stateChannel,
    ethmoApplication,
    iframeWallet.currentUser.ethersWallet
  );
  console.log(`📄 Ethmo contract deployed: ${ethmoContract.address}`);
  return ethmoContract;
}

async function submitLatestStateForEthmo() {
  const apps = getApps();
  const ethmoAppId = Object.keys(apps)[0];

  const setStateTransaction = await iframeWallet.currentUser.store.getTransaction(
    ethmoAppId,
    "update" // ActionName.UPDATE
  );

  const res = await iframeWallet.currentUser.ethersWallet.sendTransaction({
    ...setStateTransaction,
    gasLimit: GAS_LIMITS.SET_STATE_COMMITMENT
  });

  console.log(
    `📝 State sent to contract: tx=${(await res.wait()).transactionHash}`
  );
}

async function mine() {
  const ethmoState = await ethmoContract.state();
  const finalizationBlockerNumber = ethmoState.finalizesAt.toString();
  const currentBlockNumber = await iframeWallet.currentUser.ethersWallet.provider.getBlockNumber();
  for (
    let blockCount = 0;
    blockCount < finalizationBlockerNumber - currentBlockNumber;
    blockCount++
  ) {
    await iframeWallet.currentUser.ethersWallet.provider.send("evm_mine", []);
  }
  console.log(`⌛️ Waited for timeout`);
}

async function setResolution() {
  const apps = getApps();
  const ethmoApplication = Object.values(apps)[0];
  const { cfApp: app, terms, encodedState } = ethmoApplication;
  const appData = [
    app.address,
    app.applyAction,
    app.resolve,
    app.getTurnTaker,
    app.isStateTerminal
  ];
  const termsData = ethers.utils.defaultAbiCoder.encode(
    ["bytes1", "uint8", "uint256", "address"],
    ["0x19", terms.assetType, terms.limit, terms.token]
  );
  await ethmoContract.setResolution(appData, encodedState, termsData);
  console.log(`✅ State channel resolved`);
}

async function everythingUptoWithdraw() {
  await deployEthmoStateChannel();
  await deployFreeBalanceStateChannel();
  await submitLatestStateForEthmo();
  await mine();
  await setResolution();
}

async function withdraw() {
  const apps = getApps();
  const ethmoAppId = Object.keys(apps)[0];

  const installTransaction = await iframeWallet.currentUser.store.getTransaction(
    ethmoAppId,
    "install" // ActionName.INSTALL
  );

  const res = await iframeWallet.currentUser.ethersWallet.sendTransaction({
    ...installTransaction,
    gasLimit: GAS_LIMITS.INSTALL_COMMITMENT
  });

  console.log(`💸 Money withdrawn: ${(await res.wait()).transactionHash}`);
}

function deployFreeBalanceContract(networkContext, stateChannel, wallet) {
  const signingKeys = [
    stateChannel.freeBalance.alice,
    stateChannel.freeBalance.bob
  ];
  const salt = 0;
  // FIXME: Hard-coded, based on FreeBalance.contractInterface
  const appHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["tuple(address, bytes4, bytes4, bytes4, bytes4)"],
      [
        [
          networkContext.paymentAppAddr,
          "0x00000000",
          "0x860032b3",
          "0x00000000",
          "0x00000000"
        ]
      ]
    )
  );
  // FIXME: Hard-coded, based on FreeBalance.terms()
  const termsHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["bytes1", "uint8", "uint256", "address"],
      [
        "0x19",
        0,
        ethers.utils.parseEther("0.001"),
        ethers.constants.AddressZero
      ]
    )
  );
  const timeout = 100;
  return deployAppInstance(
    networkContext,
    stateChannel,
    wallet,
    salt,
    signingKeys,
    appHash,
    termsHash,
    timeout
  );
}

async function deployApplicationStateChannel(
  networkContext,
  stateChannel,
  application,
  ethersWallet
) {
  return deployAppInstance(
    networkContext,
    stateChannel,
    ethersWallet,
    application.uniqueId,
    [application.peerA.address, application.peerB.address],
    application.cfApp.hash(),
    application.terms.hash(),
    application.timeout
  );
}

async function deployAppInstance(
  networkContext,
  stateChannel,
  ethersWallet,
  salt,
  signingKeys,
  appHash,
  termsHash,
  timeout
) {
  registry = new ethers.Contract(
    networkContext.registryAddr,
    [
      "function deploy(bytes, uint256)",
      "function resolver(bytes32) view returns (address)"
    ],
    ethersWallet
  );

  const initcode = new ethers.utils.Interface(
    iframeWallet.appInstanceArtifact.abi
  ).deployFunction.encode(
    networkContext.linkedBytecode(iframeWallet.appInstanceArtifact.bytecode),
    [stateChannel.multisigAddress, signingKeys, appHash, termsHash, timeout]
  );

  await registry.functions.deploy(initcode, salt, {
    gasLimit: GAS_LIMITS.DEPLOY_APP_INSTANCE
  });

  const cfAddress = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes1", "bytes", "uint256"],
      ["0x19", initcode, salt]
    )
  );

  const address = await registry.functions.resolver(cfAddress);

  return new ethers.Contract(
    address,
    iframeWallet.appInstanceArtifact.abi,
    ethersWallet
  );
}
