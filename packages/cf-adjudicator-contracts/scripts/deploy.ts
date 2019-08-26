import { Wallet, providers, ContractFactory } from "ethers";

import ChallengeRegistry from "@counterfactual/cf-funding-protocol-contracts/expected-build/ChallengeRegistry.json";
import tdr from "truffle-deploy-registry";

const InfuraProvider = providers.InfuraProvider;

declare var process : {
  env: any
}
const ETH_ACCOUNT_MNENOMIC = "" || process.env.ETH_ACCOUNT_MNENOMIC;
const INFURA_API_KEY = "" || process.env.INFURA_API_KEY;
const NETWORK_NAME = "" || process.env.NETWORK_NAME;

const provider = new InfuraProvider(NETWORK_NAME, INFURA_API_KEY);
const wallet = Wallet.fromMnemonic(ETH_ACCOUNT_MNENOMIC!).connect(provider);

const networkId = {
  "rinkeby": 42
}[NETWORK_NAME];

(async () => {

  // todo: verify already deployed

  const factory = new ContractFactory(ChallengeRegistry.abi, ChallengeRegistry.evm.bytecode.object, wallet);
  const f = await factory.deploy();
  const contract = await f.deployed();
  tdr.append(networkId, {
    contractName: "ChallengeRegistry",
    address: contract.address
  });
})().catch(console.error);

