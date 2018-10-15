const wallet = new counterfactualWallet.IframeWallet();
const listeners = [];

let ethmoContract;
let multisigContract;
let nonceRegistry;

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
  const injectedWalletScript = `${await getSourceCode("wa")};`;

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

  wallet.setUser(key, pkey);

  await wallet.initUser(key);

  wallet.onMessage(msg => {
    const message = {
      type: "cf:io-send",
      data: msg
    };
    sendMessageToChild(message);
  });

  wallet.onResponse(message => {
    console.log("onResponse", message);
    sendMessageToChild(message);
  });

  listeners.forEach(listener =>
    window.removeEventListener("message", listener)
  );

  const listener = event => {
    if (event.data.type === "cf:default") {
      wallet.receiveMessageFromClient(event.data);
    }
  };

  listeners.push(listener);

  window.addEventListener("message", listener);

  sendMessageToChild({ type: "cf:user-picked", key, pkey });
}

function getApps() {
  const openChannelAddress = Object.keys(
    wallet.currentUser.vm.cfState.channelStates
  )[0];
  return wallet.currentUser.vm.cfState.channelStates[openChannelAddress]
    .appChannels;
}

function getStateChannels() {
  return wallet.currentUser.vm.cfState.channelStates;
}

async function deployFreeBalanceStateChannel() {
  const stateChannels = getStateChannels();
  const stateChannel = Object.values(stateChannels)[0];
  const contract = await deployFreeBalanceContract(
    wallet.defaultNetwork(),
    stateChannel,
    wallet.currentUser.ethersWallet
  );
  console.log(`📄 FreeBalance contract deployed: ${contract.address}`);
}

async function deployEthmoStateChannel() {
  const apps = getApps();
  const ethmoApplication = Object.values(apps)[0];
  const stateChannels = getStateChannels();
  const stateChannel = Object.values(stateChannels)[0];
  ethmoContract = await deployApplicationStateChannel(
    wallet.defaultNetwork(),
    stateChannel,
    ethmoApplication,
    wallet.currentUser.ethersWallet
  );
  console.log(`📄 Ethmo contract deployed: ${ethmoContract.address}`);
  return ethmoContract;
}

async function submitLatestStateForEthmo() {
  const apps = getApps();
  const ethmoAppId = Object.keys(apps)[0];

  const setStateTransaction = await wallet.currentUser.store.getTransaction(
    ethmoAppId,
    "update" // ActionName.UPDATE
  );

  const res = await wallet.currentUser.ethersWallet.sendTransaction({
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
  const currentBlockNumber = await wallet.currentUser.ethersWallet.provider.getBlockNumber();
  for (
    let blockCount = 0;
    blockCount < finalizationBlockerNumber - currentBlockNumber;
    blockCount++
  ) {
    await wallet.currentUser.ethersWallet.provider.send("evm_mine", []);
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

  const installTransaction = await wallet.currentUser.store.getTransaction(
    ethmoAppId,
    "install" // ActionName.INSTALL
  );

  const res = await wallet.currentUser.ethersWallet.sendTransaction({
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
  // FIXME: Hard-coded, based on CfFreeBalance.contractInterface
  const appHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["tuple(address, bytes4, bytes4, bytes4, bytes4)"],
      [
        [
          networkContext.PaymentApp,
          "0x00000000",
          "0x860032b3",
          "0x00000000",
          "0x00000000"
        ]
      ]
    )
  );
  // FIXME: Hard-coded, based on CfFreeBalance.terms()
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
  wallet
) {
  return deployAppInstance(
    networkContext,
    stateChannel,
    wallet,
    application.uniqueId,
    [application.peerA.address, application.peerB.address],
    application.cfApp.hash(),
    application.terms.hash(),
    application.timeout
  );
}

async function loadStateChannelArtifact() {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("GET", "/contracts/build/contracts/StateChannel.json", true);

    request.onload = function() {
      if (request.status >= 200 && request.status < 400) {
        resolve(JSON.parse(request.responseText));
      } else {
        reject(request);
      }
    };

    request.onerror = reject;

    request.send();
  });
}

async function deployAppInstance(
  networkContext,
  stateChannel,
  wallet,
  salt,
  signingKeys,
  appHash,
  termsHash,
  timeout
) {
  const registry = new ethers.Contract(
    networkContext.Registry,
    [
      "function deploy(bytes, uint256)",
      "function resolver(bytes32) view returns (address)"
    ],
    wallet
  );

  const StateChannel = await loadStateChannelArtifact();

  const initcode = new ethers.utils.Interface(
    StateChannel.abi
  ).deployFunction.encode(networkContext.linkBytecode(StateChannel.bytecode), [
    stateChannel.multisigAddress,
    signingKeys,
    appHash,
    termsHash,
    timeout
  ]);

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

  return new ethers.Contract(address, StateChannel.abi, wallet);
}
