import { AssetType } from "../store/types";
import { defaultToken } from "../types";

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
