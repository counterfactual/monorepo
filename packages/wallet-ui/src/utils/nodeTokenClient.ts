import { AssetType } from "../store/types";
import { AddressZero } from "ethers/constants";

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
      tokenAddress: AddressZero,
      name: "Ethereum",
      shortName: "ETH"
    },
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
};
