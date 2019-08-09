import {
  bigNumberify,
  BigNumberish,
  computeAddress,
  parseEther
} from "ethers/utils";
import { fromExtendedKey, HDNode } from "ethers/utils/hdnode";
import { BalanceRequest, Deposit, User, AssetType } from "../store/types";
import { CounterfactualEvent, CounterfactualMethod } from "../types";
import delay from "./delay";

export function xkeyKthAddress(xkey: string, k: number): string {
  return computeAddress(xkeyKthHDNode(xkey, k).publicKey);
}

export function xkeyKthHDNode(xkey: string, k: number): HDNode {
  return fromExtendedKey(xkey).derivePath(`${k}`);
}

export async function getNodeAddress(): Promise<string> {
  const data = await window.ethereum.send(CounterfactualMethod.GetNodeAddress);

  return data.result;
}

export async function getUserFromStoredToken(): Promise<User> {
  const data = await window.ethereum.send(CounterfactualMethod.RequestUser);

  return data.result;
}

export async function storeTokenFromUser({ token }: User): Promise<void> {
  window.ethereum.send(CounterfactualMethod.SetUser, [token]);
}

export function buildRegistrationSignaturePayload(data: User) {
  return [
    "PLAYGROUND ACCOUNT REGISTRATION",
    `Username: ${data.username}`,
    `E-mail: ${data.email}`,
    `Ethereum address: ${data.ethAddress}`,
    `Node address: ${data.nodeAddress}`
  ].join("\n");
}

export function buildSignatureMessageForLogin(ethAddress: string) {
  return ["PLAYGROUND ACCOUNT LOGIN", `Ethereum address: ${ethAddress}`].join(
    "\n"
  );
}

export async function forMultisig(): Promise<string> {
  return new Promise(async resolve => {
    const data = await window.ethereum.send(CounterfactualEvent.CreateChannel);
    return resolve(data.result.data.multisigAddress);
  });
}

export async function requestWithdraw({
  amount,
  multisigAddress,
  ethAddress,
  tokenAddress
}: Deposit) {
  console.log("requestWithdraw", "amount", amount);
  console.log("requestWithdraw", "multisigAddress", multisigAddress);
  console.log("requestWithdraw", "ethAddress", ethAddress);
  console.log("requestWithdraw", "tokenAddress", tokenAddress);

  return window.ethereum.send(CounterfactualMethod.RequestWithdraw, [
    amount,
    multisigAddress,
    ethAddress,
    tokenAddress
  ]);
}

export async function requestDeposit({
  amount,
  multisigAddress,
  tokenAddress
}: Deposit) {
  return window.ethereum.send(CounterfactualMethod.RequestDeposit, [
    amount,
    multisigAddress,
    tokenAddress
  ]);
}

export async function forFunds(
  { multisigAddress, nodeAddress, tokenAddress }: BalanceRequest,
  fundsOwner?: "user" | "counterparty" | "both"
): Promise<BigNumberish> {
  const MINIMUM_EXPECTED_BALANCE = parseEther("0.01");

  const freeBalance = (await window.ethereum.send(
    CounterfactualMethod.RequestBalances,
    [multisigAddress, tokenAddress]
  )).result;
  const freeBalanceAddress = xkeyKthAddress(nodeAddress, 0);

  const counterpartyFreeBalanceAddress = Object.keys(freeBalance).find(
    address => address !== freeBalanceAddress
  ) as string;

  const myBalance = bigNumberify(freeBalance[freeBalanceAddress]);

  const counterpartyBalance = bigNumberify(
    freeBalance[counterpartyFreeBalanceAddress]
  );

  const enoughCounterpartyBalance = counterpartyBalance.gte(
    MINIMUM_EXPECTED_BALANCE
  );
  const enoughMyBalance = myBalance.gte(MINIMUM_EXPECTED_BALANCE);
  switch (fundsOwner) {
    case "user":
      if (enoughMyBalance) {
        return myBalance;
      }
      break;
    case "counterparty":
      if (enoughCounterpartyBalance) {
        return myBalance;
      }
      break;
    case "both":
    default:
      if (enoughCounterpartyBalance && enoughMyBalance) {
        return myBalance;
      }
      break;
  }

  // !TODO: This should die in a fire :-)
  await delay(1000);

  return forFunds({ multisigAddress, nodeAddress, tokenAddress }, fundsOwner);
}

export async function getCFBalances({
  multisigAddress,
  nodeAddress,
  tokenAddress
}: BalanceRequest): Promise<BigNumberish> {
  const freeBalance = (await window.ethereum.send(
    CounterfactualMethod.RequestBalances,
    [multisigAddress, tokenAddress]
  )).result;
  const freeBalanceAddress = xkeyKthAddress(nodeAddress, 0);
  return bigNumberify(freeBalance[freeBalanceAddress]);
}

export async function getIndexedCFBalances({
  multisigAddress,
  nodeAddress
}: BalanceRequest): Promise<AssetType[]> {
  const indexedBalances: {
    [key: string]: { [key: string]: BigNumberish };
  } = (await window.ethereum.send(CounterfactualMethod.RequestIndexedBalances, [
    multisigAddress
  ])).result;

  const freeBalanceAddress = xkeyKthAddress(nodeAddress, 0);

  return Object.entries(indexedBalances).map(([tokenAddress, balances]) => ({
    tokenAddress,
    counterfactualBalance: balances[freeBalanceAddress]
  }));
}

export async function getChannelAddresses(): Promise<string[]> {
  const { multisigAddresses } = (await window.ethereum.send(
    CounterfactualMethod.RequestChannels
  )).result;

  return multisigAddresses;
}

export async function getChannel(multisigAddress: string): Promise<any> {
  const { data } = (await window.ethereum.send(
    CounterfactualMethod.RequestChannel,
    [multisigAddress]
  )).result;

  return data;
}
