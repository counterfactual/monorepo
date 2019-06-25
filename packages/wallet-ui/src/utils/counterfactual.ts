import { User, Deposit, BalanceRequest } from "../store/types";
import { CounterfactualMethod, CounterfactualEvent } from "../types";
import {
  computeAddress,
  bigNumberify,
  parseEther,
  BigNumberish
} from "ethers/utils";
import { fromExtendedKey, HDNode } from "ethers/utils/hdnode";
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

export async function getUserFromStoredToken(): Promise<{
  balance: string;
  user: User;
}> {
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

export async function forMultisig(): Promise<string> {
  return new Promise(async resolve => {
    const data = await window.ethereum.send(CounterfactualEvent.CreateChannel);
    return resolve(data.result.data.multisigAddress);
  });
}

export async function requestDeposit({ amount, multisigAddress }: Deposit) {
  return window.ethereum.send(CounterfactualMethod.RequestDeposit, [
    amount,
    multisigAddress
  ]);
}

export async function whenDepositStartsThen(callback: Function) {
  const data = await window.ethereum.send(
    CounterfactualEvent.RequestDepositStart
  );
  return callback(data);
}

export async function forFunds({
  multisigAddress,
  nodeAddress
}: BalanceRequest): Promise<BigNumberish> {
  return new Promise(async resolve => {
    const MINIMUM_EXPECTED_BALANCE = parseEther("0.01");

    const freeBalance = (await window.ethereum.send(
      CounterfactualMethod.RequestBalances,
      [multisigAddress]
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

    if (enoughCounterpartyBalance && enoughMyBalance) {
      return resolve(myBalance);
    }

    await delay(1000);
    return forFunds({ multisigAddress, nodeAddress });
  });
}
