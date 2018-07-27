import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as chaiBigNumber from "chai-bignumber";
import * as chaiString from "chai-string";
import * as ethers from "ethers";

// tslint:disable-next-line
import { Provider } from "ethers/providers";

// https://github.com/ethers-io/ethers.js/pull/225
// @ts-ignore
ethers.types.BigNumber.prototype.equals = function(
  other: ethers.types.BigNumberish
) {
  return this.eq(other);
};

export const should = chai
  .use(chaiAsPromised)
  .use(chaiString)
  .use(chaiBigNumber(ethers.types.BigNumber))
  .should();

export const UNIT_ETH = ethers.utils.parseEther("1");
export const highGasLimit = { gasLimit: 6e9 };
export const unusedAddr = "0x0000000000000000000000000000000000000001";
export const zeroAddress = "0x0000000000000000000000000000000000000000";
export const zeroBytes32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export const deployContract = async (
  contract: any,
  providerOrSigner: ethers.Wallet | Provider
): Promise<ethers.Contract> => {
  return new ethers.Contract(
    (await contract.new()).address,
    contract.abi,
    providerOrSigner
  );
};

export const getDeployedContract = async (
  contract: any,
  providerOrSigner: ethers.Wallet | Provider
): Promise<ethers.Contract> => {
  return new ethers.Contract(
    (await contract.deployed()).address,
    contract.abi,
    providerOrSigner
  );
};

export const randomETHAddress = (): string =>
  ethers.utils.hexlify(ethers.utils.randomBytes(20));

export const setupTestEnv = (web3: any) => {
  const provider = new ethers.providers.Web3Provider(web3.currentProvider);
  const unlockedAccount = new ethers.Wallet(
    "0x2bdd21761a483f71054e14f5b827213567971c676928d9a1808cbfa4b7501200",
    provider
  );
  return { provider, unlockedAccount };
};

export function signMessage(message, wallet): [number, string, string] {
  const signingKey = new ethers.SigningKey(wallet.privateKey);
  const sig = signingKey.signDigest(message);
  if (!sig.recoveryParam) {
    throw new Error("could not sign with wallet");
  }
  return [sig.recoveryParam + 27, sig.r, sig.s];
}

export function signMessageVRS(message, wallets: ethers.Wallet[]) {
  const v: number[] = [];
  const r: string[] = [];
  const s: string[] = [];
  for (const wallet of wallets) {
    const [vi, ri, si] = signMessage(message, wallet);
    v.push(vi);
    r.push(ri);
    s.push(si);
  }
  return { v, r, s };
}

export function signMessageRaw(message, wallet) {
  const [v, r, s] = signMessage(message, wallet);
  return (
    ethers.utils.hexlify(ethers.utils.padZeros(r, 32)).substring(2) +
    ethers.utils.hexlify(ethers.utils.padZeros(s, 32)).substring(2) +
    v.toString(16)
  );
}

export function signMessageBytes(message, wallets) {
  let signatures = "";
  for (const wallet of wallets) {
    signatures += signMessageRaw(message, wallet);
  }
  return "0x" + signatures;
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
  if (contractFactory != null) {
    return contractFactory.at(param);
  } else {
    return param;
  }
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
    web3.currentProvider.sendAsync(
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

export const mineBlocks = async blocks => {
  for (let i = 0; i < blocks; i++) {
    await mineOneBlock();
  }
};

export async function getEthBalance(address, provider) {
  const balance = await provider.getBalance(address);
  return fromWei(balance);
}

export function fromWei(num) {
  return num / 1000000000000000000;
}
