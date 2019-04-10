import dotenv from "dotenv-safe";
import { Wallet } from "ethers";
import { JsonRpcProvider } from "ethers/providers";

dotenv.config();

// Can use ! because dotenv-safe ensures value is set
const host = process.env.DEV_GANACHE_HOST!;
const port = process.env.DEV_GANACHE_PORT!;
const mnemonic = process.env.DEV_GANACHE_MNEMONIC!;

export async function connectToGanache(): Promise<
  [JsonRpcProvider, Wallet, number]
> {
  const provider = new JsonRpcProvider(`http://${host}:${port}`);
  const wallet = Wallet.fromMnemonic(mnemonic).connect(provider);
  const networkId = (await provider.getNetwork()).chainId;
  return [provider, wallet, networkId];
}
