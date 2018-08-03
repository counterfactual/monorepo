import * as chai from "chai";
import * as chaiAsPromised from "chai-as-promised";
import * as chaiBigNumber from "chai-bignumber";
import * as chaiString from "chai-string";
import * as ethers from "ethers";

import {
  AppEncoder,
  computeActionHash,
  computeNonceRegistryKey,
  computeStateHash,
  TermsEncoder
} from "./stateChannel";
import { StructAbiEncoder } from "./structAbiEncoder";
export {
  StructAbiEncoder,
  computeStateHash,
  computeActionHash,
  computeNonceRegistryKey,
  TermsEncoder,
  AppEncoder
};

// https://github.com/ethers-io/ethers.js/pull/225
// @ts-ignore
ethers.types.BigNumber.prototype.equals = function(x): boolean {
  return x.eq(this);
};

export const should = chai
  .use(chaiAsPromised)
  .use(chaiString)
  .use(chaiBigNumber(null))
  .should();

export const UNIT_ETH = ethers.utils.parseEther("1");
export const HIGH_GAS_LIMIT = { gasLimit: 6e9 };
export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const ZERO_BYTES32 =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

export const deployContract = async (
  contract: any,
  providerOrSigner: ethers.Wallet | ethers.types.MinimalProvider,
  args?: any[]
): Promise<ethers.Contract> => {
  return new ethers.Contract("", contract.abi, providerOrSigner).deploy(
    contract.binary,
    ...(args || [])
  );
};

let runningTally = 0;

export async function deployContractViaRegistry(
  truffleContract: any,
  providerOrSigner: ethers.Wallet | ethers.types.MinimalProvider,
  cargs?: any[]
): Promise<{ cfAddr: string; contract: ethers.Contract }> {
  const Registry = artifacts.require("Registry");
  const registry = await getDeployedContract(Registry, providerOrSigner);
  const initcode = new ethers.Interface(
    truffleContract.abi
  ).deployFunction.encode(truffleContract.binary, cargs || []);
  const contractSalt = ethers.utils.solidityKeccak256(
    ["uint256"],
    [runningTally++]
  );
  const cfAddr = ethers.utils.solidityKeccak256(
    ["bytes1", "bytes", "uint256"],
    ["0x19", initcode, contractSalt]
  );

  await registry.functions.deploy(initcode, contractSalt, HIGH_GAS_LIMIT);

  const realAddr = await registry.functions.resolver(cfAddr);

  const contract = new ethers.Contract(
    realAddr,
    truffleContract.abi,
    providerOrSigner
  );

  return { cfAddr, contract };
}

export const getDeployedContract = async (
  contract: any,
  providerOrSigner: ethers.Wallet | ethers.types.MinimalProvider
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
    "0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d",
    provider
  );
  return { provider, unlockedAccount };
};

function signMessage(message, wallet): [number, string, string] {
  const signingKey = new ethers.SigningKey(wallet.privateKey);
  const sig = signingKey.signDigest(message);
  if (typeof sig.recoveryParam === "undefined") {
    throw Error("Signature failed.");
  }
  return [sig.recoveryParam + 27, sig.r, sig.s];
}

function signMessageRaw(message: string, wallet: ethers.Wallet) {
  const [v, r, s] = signMessage(message, wallet);
  return (
    ethers.utils.hexlify(ethers.utils.padZeros(r, 32)).substring(2) +
    ethers.utils.hexlify(ethers.utils.padZeros(s, 32)).substring(2) +
    v.toString(16)
  );
}

export function signMessageBytes(message, wallets: ethers.Wallet[]) {
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
