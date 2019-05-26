import { Wallet } from "ethers";
import { JsonRpcProvider } from "ethers/providers";

import { generateNewFundedWallet } from "../../integration/setup";

export async function connectToGanache(): Promise<
  [JsonRpcProvider, Wallet, number]
> {
  const provider = new JsonRpcProvider(global["ganacheURL"]);
  const wallet = await generateNewFundedWallet(
    global["fundedPrivateKey"],
    provider
  );
  const networkId = (await provider.getNetwork()).chainId;
  return [provider, wallet, networkId];
}
