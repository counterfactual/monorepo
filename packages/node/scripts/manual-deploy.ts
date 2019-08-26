
import { Wallet, providers } from "ethers";
import { deployTestArtifactsToChain } from "@counterfactual/local-ganache-server/src/contract-deployments.jest";

const InfuraProvider = providers.InfuraProvider;

const ETH_ACCOUNT_MNENOMIC="" || process.env.ETH_ACCOUNT_MNENOMIC;
const INFURA_API_KEY="" || process.env.INFURA_API_KEY;

const provider = new InfuraProvider("rinkeby", INFURA_API_KEY);
const wallet = Wallet.fromMnemonic(ETH_ACCOUNT_MNENOMIC!).connect(provider);

(async () => {
  deployTestArtifactsToChain(wallet)
})().catch(console.error);

