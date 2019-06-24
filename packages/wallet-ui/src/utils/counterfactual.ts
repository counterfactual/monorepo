import { User } from "../store/types";
import { CounterfactualMethod, CounterfactualEvent } from "../types";

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
    return resolve(data.result);
  });
}
