import { Node } from "@counterfactual/node";
import { Node as NodeTypes } from "@counterfactual/types";
import { formatEther, parseEther } from "ethers/utils";
import fetch from "node-fetch";
import { v4 as generateUUID } from "uuid";

import { connectNode } from "./bot";

const API_TIMEOUT = 30000;
const DELAY_SECONDS = process.env.DELAY_SECONDS
  ? Number(process.env.DELAY_SECONDS)
  : 5;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export async function getFreeBalance(
  node: Node,
  multisigAddress: string
): Promise<NodeTypes.GetFreeBalanceStateResult> {
  const query = {
    type: NodeTypes.MethodName.GET_FREE_BALANCE_STATE,
    requestId: generateUUID(),
    params: { multisigAddress } as NodeTypes.GetFreeBalanceStateParams
  };

  const { result } = await node.call(query.type, query);

  return result as NodeTypes.GetFreeBalanceStateResult;
}

export function renderFreeBalanceInEth(
  freeBalance: NodeTypes.GetFreeBalanceStateResult
) {
  const { alice, aliceBalance, bob, bobBalance } = freeBalance.state;
  console.info(`Channel's free balance`);
  console.info(`Alice: ${formatEther(aliceBalance)}  - (${alice})`);
  console.info(`Bob: ${formatEther(bobBalance)}  - (${bob})`);
}

export async function fetchMultisig(baseURL: string, token: string) {
  const bot = await getUser(baseURL, token);
  if (!bot.multisigAddress) {
    console.info(
      `The Bot doesn't have a channel with the Playground yet...Waiting for another ${DELAY_SECONDS} seconds`
    );
    // Convert to milliseconds
    await delay(DELAY_SECONDS * 1000).then(() => fetchMultisig(baseURL, token));
  }
  return (await getUser(baseURL, token)).multisigAddress;
}

// FIXME: cross-reference addresses to named-users so we can avoid using
// Alice and Bob, especially when looking at logs
export async function deposit(
  node: Node,
  amount: string,
  multisigAddress: string,
  skip: boolean = false
) {
  if (skip) {
    return;
  }

  const { aliceBalance, bobBalance } = (await getFreeBalance(
    node,
    multisigAddress
  )).state;

  console.log(`\nDepositing ${amount} ETH into ${multisigAddress}\n`);
  try {
    await node.call(NodeTypes.MethodName.DEPOSIT, {
      type: NodeTypes.MethodName.DEPOSIT,
      requestId: generateUUID(),
      params: {
        multisigAddress,
        amount: parseEther(amount),
        notifyCounterparty: true
      } as NodeTypes.DepositParams
    });

    const updatedFreeBalance = await getFreeBalance(node, multisigAddress);
    const updatedAliceBalance = updatedFreeBalance.state.aliceBalance;
    const updatedBobBalance = updatedFreeBalance.state.bobBalance;

    if (updatedAliceBalance.gt(aliceBalance)) {
      console.info("Waiting for counter party to deposit same amount");
      while (
        !(await getFreeBalance(node, multisigAddress)).state.bobBalance.gt(
          updatedBobBalance
        )
      ) {
        console.info(
          `Waiting ${DELAY_SECONDS} more seconds for counter party deposit`
        );
        await delay(DELAY_SECONDS * 1000);
      }
    } else if (updatedFreeBalance.state.bobBalance.gt(bobBalance)) {
      console.info("Waiting for counter party to deposit same amount");
      while (
        !(await getFreeBalance(node, multisigAddress)).state.aliceBalance.gt(
          updatedAliceBalance
        )
      ) {
        console.info(
          `Waiting ${DELAY_SECONDS} more seconds for counter party deposit`
        );
        await delay(DELAY_SECONDS * 1000);
      }
    } else {
      throw Error(`Neither balance was updated.\n
        Original Free Balance: alice: ${aliceBalance}, bob: ${bobBalance}\n
        Updated Free Balance: alice: ${updatedAliceBalance}, bob: ${updatedBobBalance}
      `);
    }

    renderFreeBalanceInEth(await getFreeBalance(node, multisigAddress));
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

function timeout(delay: number = API_TIMEOUT) {
  const handler = setTimeout(() => {
    throw new Error("Request timed out");
  }, delay);

  return {
    cancel() {
      clearTimeout(handler);
    }
  };
}

async function get(
  baseURL: string,
  endpoint: string,
  token: string
): Promise<APIResponse> {
  const requestTimeout = timeout();

  const httpResponse = await fetch(`${baseURL}/api/${endpoint}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  requestTimeout.cancel();

  let response;
  let retriesAvailable = 10;

  while (typeof response === "undefined") {
    try {
      response = (await httpResponse.json()) as APIResponse;
    } catch (e) {
      retriesAvailable -= 1;
      if (e.type === "invalid-json" && retriesAvailable >= 0) {
        console.log(
          `Call to ${baseURL}/api/${endpoint} returned invalid JSON. Retrying (attempt #${10 -
            retriesAvailable}).`
        );
        await delay(3000);
      } else throw e;
    }
  }

  if (response.errors) {
    const error = response.errors[0] as APIError;
    throw error;
  }

  return response;
}

async function post(
  baseURL: string,
  endpoint,
  data,
  token,
  authType = "Signature"
) {
  const body = JSON.stringify({
    data
  });
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

export async function afterUser(
  botName: string,
  node: Node,
  botPublicIdentifer: string,
  multisigAddress: string
) {
  console.log("Setting up bot's event handlers");

  await connectNode(botName, node, botPublicIdentifer, multisigAddress);
}

// TODO: don't duplicate these from PG for consistency

export async function createAccount(
  baseURL: string,
  user: UserChangeset,
  signature: string
): Promise<UserSession> {
  try {
    const data = toAPIResource<UserChangeset, UserAttributes>(user);
    const json = (await post(baseURL, "users", data, signature)) as APIResponse;
    const resource = json.data as APIResource<UserAttributes>;

    const jsonMultisig = (await post(
      baseURL,
      "multisig-deploys",
      {
        type: "multisigDeploy",
        attributes: { ethAddress: user.ethAddress }
      },
      signature
    )) as APIResponse;
    const resourceMultisig = jsonMultisig.data as APIResource<
      Partial<UserAttributes>
    >;

    resource.attributes.transactionHash = resourceMultisig.id as string;

    return fromAPIResource<UserSession, UserAttributes>(resource);
  } catch (e) {
    return Promise.reject(e);
  }
}

function fromAPIResource<TModel, TResource>(
  resource: APIResource<TResource>
): TModel {
  return ({
    id: resource.id,
    ...(resource.attributes as {})
  } as unknown) as TModel;
}

function toAPIResource<TModel, TResource>(
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

export async function getUser(
  baseURL: string,
  token: string
): Promise<UserSession> {
  if (!token) {
    throw new Error("getUser(): token is required");
  }

  try {
    const json = (await get(baseURL, "users/me", token)) as APIResponse;
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
