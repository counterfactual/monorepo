import { AssetType } from "../store/types";

export enum ShortTokenNetworksName {
  kovan = "kov",
  rinkeby = "rin",
  goerli = "goerli",
  ropsten = "rop",
  homestead = "eth"
}

export const getTokens = async (
  network: ShortTokenNetworksName
): Promise<AssetType[]> => {
  const response = await fetch(
    `https://cdn.jsdelivr.net/gh/MyEtherWallet/ethereum-lists/dist/tokens/${network}/tokens-${network}.min.json`
  );
  const parsedResponse = await response.json();
  return [
    {
      tokenAddress: "",
      name: "Ethereum",
      shortName: "ETH"
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
};
