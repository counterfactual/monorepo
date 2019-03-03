import { Node } from "@counterfactual/node";
import { Node as NodeTypes } from "@counterfactual/types";
import { ethers } from "ethers";
import fetch from "node-fetch";
import { v4 as generateUUID } from "uuid";

const API_TIMEOUT = 30000;

// TODO: don't duplicate these from PG for consistency

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function fetchMultisig(token: string) {
  let bot;
  try {
    bot = await getUser(token);
  } catch (error) {
    console.log(`Get User Error: ${error}`);
  }
  if (!bot.multisigAddress) {
    console.info(
      "The Bot doesn't have a channel with the Playground yet...Waiting for another 5 seconds"
    );
    await delay(5000);
    return await fetchMultisig(token);
  }
  console.log(`Is this null ${JSON.stringify(bot.multisigAddress)}`);
  return bot.multisigAddress;
}

export async function deposit(
  node: Node,
  amount: string,
  multisigAddress: string
) {
  console.log(`\nDepositing ${amount} ETH into ${multisigAddress}\n`);
  try {
    return node.call(NodeTypes.MethodName.DEPOSIT, {
      type: NodeTypes.MethodName.DEPOSIT,
      requestId: generateUUID(),
      params: {
        multisigAddress,
        amount: ethers.utils.parseEther(amount),
        notifyCounterparty: true
      } as NodeTypes.DepositParams
    });
  } catch (e) {
    console.error(`Failed to deposit... ${e}`);
    throw e;
  }
}

export function buildRegistrationSignaturePayload(data) {
  return [
    "PLAYGROUND ACCOUNT REGISTRATION",
    `Username: ${data.username}`,
    `E-mail: ${data.email}`,
    `Ethereum address: ${data.ethAddress}`,
    `Node address: ${data.nodeAddress}`
  ].join("\n");
}

export function timeout(delay: number = API_TIMEOUT) {
  const handler = setTimeout(() => {
    throw new Error("Request timed out");
  }, delay);

  return {
    cancel() {
      clearTimeout(handler);
    }
  };
}

export async function get(
  baseURL: string,
  endpoint: string,
  token?: string
): Promise<APIResponse> {
  const requestTimeout = timeout();

  const httpResponse = await fetch(`${baseURL}/api/${endpoint}`, {
    method: "GET",
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {}
  });

  requestTimeout.cancel();

  const response = (await httpResponse.json()) as APIResponse;

  if (response.errors) {
    const error = response.errors[0] as APIError;
    throw error;
  }

  return response;
}

export async function post(
  baseURL: string,
  endpoint,
  data,
  token,
  authType = "Signature"
) {
  const body = JSON.stringify({
    data
  });
  console.log(`Body: ${body}`);
  const httpResponse = await fetch(`${baseURL}/api/${endpoint}`, {
    body,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(token ? { Authorization: `${authType} ${token}` } : {})
    },
    method: "POST"
  });

  const response = await httpResponse.json();

  if (response.errors) {
    const error = response.errors[0];
    throw error;
  }

  return response;
}

export async function createAccount(
  baseURL: string,
  user: UserChangeset,
  signature: string
): Promise<UserSession> {
  try {
    const data = toAPIResource<UserChangeset, UserAttributes>(user);
    const json = (await post(baseURL, "users", data, signature)) as APIResponse;
    const resource = json.data as APIResource<UserAttributes>;

    return fromAPIResource<UserSession, UserAttributes>(resource);
  } catch (e) {
    return Promise.reject(e);
  }
}

export function fromAPIResource<TModel, TResource>(
  resource: APIResource<TResource>
): TModel {
  return ({
    id: resource.id,
    ...(resource.attributes as {})
  } as unknown) as TModel;
}

export function toAPIResource<TModel, TResource>(
  model: TModel
): APIResource<TResource> {
  return ({
    ...(model["id"] ? { id: model["id"] } : {}),
    attributes: {
      ...Object.keys(model)
        .map(key => {
          return { [key]: model[key] };
        })
        .reduce((previous, current) => {
          return { ...previous, ...current };
        }, {})
    }
  } as unknown) as APIResource<TResource>;
}

export async function getUser(token: string): Promise<UserSession> {
  if (!token) {
    throw new Error("getUser(): token is required");
  }

  try {
    const BASE_URL = `https://server-playground-staging.counterfactual.com`;

    const json = (await get(BASE_URL, "users/me", token)) as APIResponse;
    const resource = json.data[0] as APIResource<UserAttributes>;

    return fromAPIResource<UserSession, UserAttributes>(resource);
  } catch (e) {
    return Promise.reject(e);
  }
}

export type AppDefinition = {
  id: string;
  name: string;
  notifications?: number;
  slug: string;
  url: string;
  icon: string;
};

export interface UserChangeset {
  username: string;
  email: string;
  ethAddress: string;
  nodeAddress: string;
}

export type UserSession = {
  id: string;
  username: string;
  ethAddress: string;
  nodeAddress: string;
  email: string;
  multisigAddress: string;
  transactionHash: string;
  token?: string;
};

export type ComponentEventHandler = (event: CustomEvent<any>) => void;

export interface ErrorMessage {
  primary: string;
  secondary: string;
}

// TODO: Delete everything down below after JSONAPI-TS is implemented.

export type APIError = {
  status: HttpStatusCode;
  code: ErrorCode;
  title: string;
  detail: string;
};

export type APIResource<T = APIResourceAttributes> = {
  type: APIResourceType;
  id?: string;
  attributes: T;
  relationships?: APIResourceRelationships;
};

export type APIResourceAttributes = {
  [key: string]: string | number | boolean | undefined;
};

export type APIResourceType =
  | "user"
  | "matchmakingRequest"
  | "matchedUser"
  | "session"
  | "app";

export type APIResourceRelationships = {
  [key in APIResourceType]?: APIDataContainer
};

export type APIDataContainer<T = APIResourceAttributes> = {
  data: APIResource<T> | APIResourceCollection<T>;
};

export type APIResourceCollection<T = APIResourceAttributes> = APIResource<T>[];

export type APIResponse<T = APIResourceAttributes> = APIDataContainer<T> & {
  errors?: APIError[];
  meta?: APIMetadata;
  included?: APIResourceCollection;
};

export enum ErrorCode {
  SignatureRequired = "signature_required",
  InvalidSignature = "invalid_signature",
  AddressAlreadyRegistered = "address_already_registered",
  AppRegistryNotAvailable = "app_registry_not_available",
  UserAddressRequired = "user_address_required",
  NoUsersAvailable = "no_users_available",
  UnhandledError = "unhandled_error",
  UserNotFound = "user_not_found",
  TokenRequired = "token_required",
  InvalidToken = "invalid_token",
  UsernameAlreadyExists = "username_already_exists"
}

export enum HttpStatusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  InternalServerError = 500
}

export type APIMetadata = {
  [key: string]: string | number | boolean | APIMetadata;
};

export type APIRequest<T = APIResourceAttributes> = {
  data?: APIResource<T> | APIResourceCollection<T>;
  meta?: APIMetadata;
};

export type UserAttributes = {
  id: string;
  username: string;
  ethAddress: string;
  nodeAddress: string;
  email: string;
  multisigAddress: string;
  transactionHash: string;
  token?: string;
};

export type SessionAttributes = {
  ethAddress: string;
};

export type AppAttributes = {
  name: string;
  slug: string;
  icon: string;
  url: string;
};
