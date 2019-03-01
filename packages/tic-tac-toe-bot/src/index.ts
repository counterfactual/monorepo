import {
  FirebaseServiceFactory,
  MNEMONIC_PATH,
  Node
} from "@counterfactual/node";
// import { Node as NodeTypes } from "@counterfactual/types";
// import { v4 as generateUUID } from "uuid";
import { ethers } from "ethers";
import fetch from "node-fetch";

import { connectNode } from "./bot";

const provider = ethers.getDefaultProvider("ropsten");
const API_TIMEOUT = 30000;
let bot: UserSession;

let BASE_URL = `https://server.playground-staging.counterfactual.com`;

console.log("Creating serviceFactory");
let serviceFactory: FirebaseServiceFactory;
if (process.env.TIER && process.env.TIER === "development") {
  BASE_URL = `http://localhost:9000`;

  const firebaseServerHost = process.env.FIREBASE_SERVER_HOST;
  const firebaseServerPort = process.env.FIREBASE_SERVER_PORT;
  serviceFactory = new FirebaseServiceFactory({
    apiKey: "",
    authDomain: "",
    databaseURL: `ws://${firebaseServerHost}:${firebaseServerPort}`,
    projectId: "",
    storageBucket: "",
    messagingSenderId: ""
  });
} else {
  serviceFactory = new FirebaseServiceFactory({
    apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
    authDomain: "foobar-91a31.firebaseapp.com",
    databaseURL: "https://foobar-91a31.firebaseio.com",
    projectId: "foobar-91a31",
    storageBucket: "foobar-91a31.appspot.com",
    messagingSenderId: "432199632441"
  });
}

let node: Node;

(async () => {
  console.log("Creating store");
  const store = serviceFactory.createStoreService("tttBotStore1");

  if (!(await store.get(MNEMONIC_PATH)) && process.env.NODE_MNEMONIC) {
    await store.set([{ key: MNEMONIC_PATH, value: process.env.NODE_MNEMONIC }]);
  }

  console.log("Creating Node");
  const messService = serviceFactory.createMessagingService("messaging");
  node = await Node.create(
    messService,
    store,
    {
      STORE_KEY_PREFIX: "store"
    },
    ethers.getDefaultProvider("ropsten"),
    "ropsten"
  );

  console.log("public identifier", node.publicIdentifier);

  try {
    let botAccount = await store.get("tttBot/Account");

    if (!botAccount) {
      const user = {
        email: "TicTacToeBot",
        ethAddress: process.env.ETH_ADDRESS || "",
        nodeAddress: node.publicIdentifier,
        username: "TicTacToeBot"
      };
      const privateKey = process.env.PRIVATE_KEY;
      if (!privateKey) {
        throw Error('No private key specified in env. Exiting.');
      }
      const wallet = new ethers.Wallet(privateKey, provider);
      const signature = await wallet.signMessage(
        buildRegistrationSignaturePayload(user)
      );

      botAccount = await createAccount(user, signature);

      console.log(`Account created with token: ${botAccount.token}`);

      await store.set([{
        key: "tttBot/Account", 
        value: botAccount
      }]);
    } else {
      console.log("Bot user already exists", botAccount.token)
    }

    const multisigAddress = await fetchMultisig(botAccount.token!);

    console.log("Account multisig address:", multisigAddress);
    
    // if (!await store.get("tttBot/DepositComplete")) {
    //   let depositAmount = process.argv[2];
    //   if (!depositAmount) {
    //     depositAmount = "0.01";
    //   }
    //   await deposit(depositAmount, multisigAddress);

    //   await store.set([{
    //     key: "tttBot/DepositComplete", 
    //     value: true
    //   }]);
    // }

    afterUser(node);
  } catch (e) {
    console.error("\n");
    console.error(e);
    console.error("\n");
    process.exit(1);
  }
})();

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

async function fetchMultisig(token: string) {
  bot = await getUser(token);
  if (!bot.multisigAddress) {
    console.info(
      "The Bot doesn't have a channel with the Playground yet...Waiting for another 5 seconds"
    );
    await delay(5000).then(() => fetchMultisig(token));
  }
  return bot.multisigAddress;
}

// async function deposit(amount: string, multisigAddress: string) {
//   console.log(`\nDepositing ${amount} ETH into ${multisigAddress}\n`);
//   try {
//     return node.call(NodeTypes.MethodName.DEPOSIT, {
//       type: NodeTypes.MethodName.DEPOSIT,
//       requestId: generateUUID(),
//       params: {
//         multisigAddress,
//         amount: ethers.utils.parseEther(amount),
//         notifyCounterparty: true
//       } as NodeTypes.DepositParams
//     });
//   } catch (e) {
//     console.error(`Failed to deposit... ${e}`);
//     throw e;
//   }
// }

function buildRegistrationSignaturePayload(data) {
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

async function get(endpoint: string, token?: string): Promise<APIResponse> {
  const requestTimeout = timeout();

  const httpResponse = await fetch(`${BASE_URL}/api/${endpoint}`, {
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

async function post(endpoint, data, token, authType = "Signature") {
  const body = JSON.stringify({
    data
  });
  console.log(`Body: ${body}`);
  const httpResponse = await fetch(`${BASE_URL}/api/${endpoint}`, {
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

async function afterUser(node) {
  console.log("After User");

  await connectNode(node, process.env.ETH_ADDRESS || "");
}

// TODO: don't duplicate these from PG for consistency

async function createAccount(
  user: UserChangeset,
  signature: string
): Promise<UserSession> {
  try {
    const data = toAPIResource<UserChangeset, UserAttributes>(user);
    const json = (await post("users", data, signature)) as APIResponse;
    const resource = json.data as APIResource<UserAttributes>;

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

async function getUser(token: string): Promise<UserSession> {
  if (!token) {
    throw new Error("getUser(): token is required");
  }

  try {
    const json = (await get("users/me", token)) as APIResponse;
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
