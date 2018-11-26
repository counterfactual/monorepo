import { ethers } from "ethers";

export const UNIT_ETH = ethers.utils.parseEther("1");
export const HIGH_GAS_LIMIT = { gasLimit: 6e9 };

export const deployContract = async (
  contract: any,
  wallet: ethers.Wallet,
  args?: any[]
): Promise<ethers.Contract> => {
  const contractFactory = new ethers.ContractFactory(
    contract.abi,
    contract.binary,
    wallet
  );
  return contractFactory.deploy(...(args || []));
};

export const getDeployedContract = async (
  contract: any,
  providerOrSigner: ethers.Wallet | ethers.providers.Provider
): Promise<ethers.Contract> => {
  return new ethers.Contract(
    (await contract.deployed()).address,
    contract.abi,
    providerOrSigner
  );
};

export const randomETHAddress = (): string =>
  ethers.utils.hexlify(ethers.utils.randomBytes(20));

export function generateEthWallets(
  count: number,
  provider?: ethers.providers.Provider
): ethers.Wallet[] {
  return Array(count)
    .fill(0)
    .map(() => {
      let wallet = ethers.Wallet.createRandom();
      if (provider) {
        wallet = wallet.connect(provider);
      }
      return wallet;
    });
}

export const setupTestEnv = (web3: any) => {
  const provider = new ethers.providers.Web3Provider(web3.currentProvider);
  const unlockedAccount = new ethers.Wallet(
    process.env.npm_package_config_unlockedAccount!,
    provider
  );
  return { provider, unlockedAccount };
};

export function signMessageVRS(message, wallet): [number, string, string] {
  const signingKey = new ethers.utils.SigningKey(wallet.privateKey);
  const sig = signingKey.signDigest(message);
  if (typeof sig.recoveryParam === "undefined") {
    throw Error("Signature failed.");
  }
  return [sig.recoveryParam + 27, sig.r, sig.s];
}

export function signMessageBytes(message: string, wallet: ethers.Wallet) {
  const [v, r, s] = signMessageVRS(message, wallet);
  return (
    ethers.utils.hexlify(ethers.utils.padZeros(r, 32)).substring(2) +
    ethers.utils.hexlify(ethers.utils.padZeros(s, 32)).substring(2) +
    v.toString(16)
  );
}

export function signMessage(message, ...wallets: ethers.Wallet[]) {
  wallets.sort((a, b) => a.address.localeCompare(b.address));
  const signatures = wallets.map(w => signMessageBytes(message, w));
  return `0x${signatures.join("")}`;
}

export function getParamFromTxEvent(
  transaction,
  eventName,
  paramName,
  contract,
  contractFactory
) {
  let logs = transaction.logs;
  if (eventName != null) {
    logs = logs.filter(l => l.event === eventName && l.address === contract);
  }
  chai.assert.equal(logs.length, 1, "too many logs found!");
  const param = logs[0].args[paramName];
  return contractFactory != null ? contractFactory.at(param) : param;
}

export async function assertRejects(q, msg?) {
  let res;
  let catchFlag = false;
  try {
    res = await q;
  } catch (e) {
    catchFlag = true;
  } finally {
    if (!catchFlag) {
      chai.assert.fail(res, null, msg);
    }
  }
}

export const mineOneBlock = () => {
  const web3 = (global as any).web3;
  return new Promise((resolve, reject) => {
    web3.currentProvider.send(
      {
        id: new Date().getTime(),
        jsonrpc: "2.0",
        method: "evm_mine",
        params: []
      },
      (err, result) => {
        if (err) {
          return reject(err);
        }
        return resolve(result);
      }
    );
  });
};

export const mineBlocks = async function(n: number) {
  for (const _ of Array(n)) {
    await mineOneBlock();
  }
};
