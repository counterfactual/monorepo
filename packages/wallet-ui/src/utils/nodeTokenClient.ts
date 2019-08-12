import { Zero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { formatEther } from "ethers/utils";
import { AssetType } from "../store/types";
import { defaultToken } from "../types";

export enum ShortTokenNetworksName {
  kovan = "kov",
  rinkeby = "rin",
  goerli = "goerli",
  ropsten = "rop",
  homestead = "eth"
}

export const getFormattedBalanceFrom = (
  tokenAddresses: AssetType[],
  index: number = 0,
  from: "walletBalance" | "counterfactualBalance" = "counterfactualBalance"
): string => {
  return formatEther(
    (tokenAddresses[index] && tokenAddresses[index][from]) || Zero
  );
};

export const getUserWalletBalances = async (
  provider: Web3Provider,
  walletAddress: string,
  tokens: AssetType[]
): Promise<any> => {
  tokens[0].walletBalance = await provider.getBalance(walletAddress);
  for (let index = 1; index < tokens.length; index = index + 1) {
    const token = tokens[index];
    try {
      const response = await fetch(
        `https://kovan.etherscan.io/api?module=account&action=tokenbalance&contractaddress=${token.tokenAddress}&address=${walletAddress}&tag=latest&apikey=${process.env.REACT_APP_ETHERSCAN_API_KEY}`
      );
      const parsedResponse = await response.json();
      if (parsedResponse && parsedResponse.result) {
        token.walletBalance = parsedResponse.result;
      }
    } catch (error) {
      console.error("error retrieving user wallet balance", error.message);
      token.walletBalance = Zero;
    }
  }
  return tokens;
};

export const getTokens = async (
  network: ShortTokenNetworksName
): Promise<AssetType[]> => {
  try {
    const response = await fetch(
      `https://raw.githubusercontent.com/MyEtherWallet/ethereum-lists/master/dist/tokens/${network}/tokens-${network}.min.json`
    );

    const parsedResponse = await response.json();

    return [
      defaultToken,
      {
        // TODO: DELETE at some point - for internal CF testing purposes
        tokenAddress: "0x2fc2554c231bd4d9da4720dcf4db2f37e03a40ae",
        name: "SANTIAGO",
        shortName: "SAN"
      }
    ].concat(
      parsedResponse
        .filter(({ type }) => type === "ERC20")
        .map(({ address: tokenAddress, name, symbol: shortName }) => ({
          tokenAddress,
          name,
          shortName
        }))
    );
  } catch (error) {
    console.error("error while getting tokens", error.message);
    return [defaultToken];
  }
};
