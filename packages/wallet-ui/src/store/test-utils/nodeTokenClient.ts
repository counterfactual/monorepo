import { Zero } from "ethers/constants";
import { AssetType } from "../types";
import { defaultToken } from "../../types";
import { BigNumberish } from "ethers/utils";

export const postKovanNetworkEthereumList = () =>
  '[{"symbol":"AE","name":"Aeternity","type":"ERC20","address":"0x8667559254241ddeD4d11392f868d72092765367","ens_address":"","decimals":18,"website":"","logo":{"src":"","width":"","height":"","ipfs_hash":""},"support":{"email":"info@aeternity.com","url":""},"social":{"blog":"","chat":"","facebook":"","forum":"","github":"","gitter":"","instagram":"","linkedin":"","reddit":"","slack":"","telegram":"","twitter":"","youtube":""}},{"symbol":"DAI","name":"Dai Stablecoin v1.0","type":"ERC20","address":"0xc4375b7de8af5a38a93548eb8453a498222c4ff2","ens_address":"","decimals":18,"website":"https://makerdao.com","logo":{"src":"","width":"","height":"","ipfs_hash":""},"support":{"email":"support@makerdao.com","url":"https://chat.makerdao.com"},"social":{"blog":"","chat":"https://chat.makerdao.com","facebook":"","forum":"","github":"https://github.com/makerdao","gitter":"","instagram":"","linkedin":"","reddit":"https://www.reddit.com/r/MakerDAO","slack":"","telegram":"","twitter":"https://twitter.com/MakerDAO","youtube":""}},{"symbol":"GUP","name":"GUP","type":"ERC20","address":"0x3C67f7D4decF7795225f51b54134F81137385f83","ens_address":"","decimals":3,"website":"","logo":{"src":"","width":"","height":"","ipfs_hash":""},"support":{"email":"","url":""},"social":{"blog":"","chat":"","facebook":"","forum":"","github":"","gitter":"","instagram":"","linkedin":"","reddit":"","slack":"","telegram":"","twitter":"","youtube":""}},{"symbol":"MKR","name":"MakerDAO","type":"ERC20","address":"0xaaf64bfcc32d0f15873a02163e7e500671a4ffcd","ens_address":"","decimals":18,"website":"https://makerdao.com","logo":{"src":"","width":"","height":"","ipfs_hash":""},"support":{"email":"support@makerdao.com","url":"https://chat.makerdao.com"},"social":{"blog":"","chat":"https://chat.makerdao.com","facebook":"","forum":"","github":"https://github.com/makerdao","gitter":"","instagram":"","linkedin":"","reddit":"https://reddit.com/r/makerdao","slack":"","telegram":"","twitter":"https://twitter.com/MakerDAO","youtube":""}},{"symbol":"RLC","name":"iExec RLC","type":"ERC20","address":"0xc57538846ec405ea25deb00e0f9b29a432d53507","ens_address":"","decimals":9,"website":"https://iex.ec","logo":{"src":"https://ipfs.io/ipfs/QmcjNqEC4uDyZJBM946Pyrh8murWVkMh9ufBjpt5hPYuZp","width":"128px","height":"128px","ipfs_hash":"QmcjNqEC4uDyZJBM946Pyrh8murWVkMh9ufBjpt5hPYuZp"},"support":{"email":"support@iex.ec","url":"https://gitter.im/iExecBlockchainComputing/Lobby"},"social":{"blog":"https://medium.com/iex-ec","chat":"","facebook":"https://www.facebook.com/Iex-ec-1164124083643301/","forum":"","github":"https://github.com/iExecBlockchainComputing/","gitter":"https://gitter.im/iExecBlockchainComputing","instagram":"https://www.instagram.com/iexec_team/","linkedin":"https://www.linkedin.com/company/iex.ec/","reddit":"https://www.reddit.com/r/iexec/","slack":"https://slack.iex.ec/","telegram":"https://t.me/iexec_announcements","twitter":"https://slack.iex.ec/","youtube":"https://www.youtube.com/channel/UCwWxZWvKVHn3CXnmDooLWtA"}}]';

export const NETWORK_KOVAN_TOKENS: AssetType[] = [
  {
    tokenAddress: defaultToken.tokenAddress,
    name: defaultToken.name,
    shortName: defaultToken.shortName,
    counterfactualBalance: defaultToken.counterfactualBalance
  },
  {
    tokenAddress: "0x2fc2554c231bd4d9da4720dcf4db2f37e03a40ae",
    name: "SANTIAGO",
    shortName: "SAN"
  },
  {
    tokenAddress: "0x8667559254241ddeD4d11392f868d72092765367",
    name: "Aeternity",
    shortName: "AE"
  },
  {
    tokenAddress: "0xc4375b7de8af5a38a93548eb8453a498222c4ff2",
    name: "Dai Stablecoin v1.0",
    shortName: "DAI"
  },
  {
    tokenAddress: "0x3C67f7D4decF7795225f51b54134F81137385f83",
    name: "GUP",
    shortName: "GUP"
  },
  {
    tokenAddress: "0xaaf64bfcc32d0f15873a02163e7e500671a4ffcd",
    name: "MakerDAO",
    shortName: "MKR"
  },
  {
    tokenAddress: "0xc57538846ec405ea25deb00e0f9b29a432d53507",
    name: "iExec RLC",
    shortName: "RLC"
  }
];

export const USER_KOVAN_TOKENS_MOCK = (
  counterfactualBalance = Zero,
  walletBalance?: BigNumberish
): AssetType[] => {
  const token = walletBalance
    ? {
        walletBalance,
        counterfactualBalance,
        tokenAddress: "0x0000000000000000000000000000000000000000"
      }
    : {
        counterfactualBalance,
        tokenAddress: "0x0000000000000000000000000000000000000000"
      };
  return [token];
};
