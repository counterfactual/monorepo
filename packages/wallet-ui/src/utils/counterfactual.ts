import { User } from "../store/types";
import { CounterfactualMethod, CounterfactualEvent } from "../types";
import log from "./log";

export async function getNodeAddress(): Promise<string> {
  const data = await window.ethereum.send(CounterfactualMethod.GetNodeAddress);

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
  return new Promise((resolve, reject) => {
    debugger;
    return window.ethereum
      .send(CounterfactualEvent.CreateChannel)
      .then(data => resolve(data.result))
      .catch(error => {
        log("i'm anxious, can't wait for the multisig because", error);
        reject(error);
      });
  });
}
