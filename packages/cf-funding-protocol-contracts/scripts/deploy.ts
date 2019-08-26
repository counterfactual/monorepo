
import { Wallet, providers, ContractFactory } from "ethers";

import ChallengeRegistry from "@counterfactual/cf-funding-protocol-contracts/expected-build/ChallengeRegistry.json";

const InfuraProvider = providers.InfuraProvider;

declare var process : {
  env: any
}
const ETH_ACCOUNT_MNENOMIC = "" || process.env.ETH_ACCOUNT_MNENOMIC;
const INFURA_API_KEY = "" || process.env.INFURA_API_KEY;

const provider = new InfuraProvider("rinkeby", INFURA_API_KEY);
const wallet = Wallet.fromMnemonic(ETH_ACCOUNT_MNENOMIC!).connect(provider);

(async () => {
  const factory = new ContractFactory(ChallengeRegistry.abi, ChallengeRegistry.evm.bytecode.object, wallet);
  const f = await factory.deploy();
  const contract = await f.deployed();
  console.log(contract.address);
})().catch(console.error);

