import { FirebaseServiceFactory, Node } from "@counterfactual/node";
import { Node as NodeTypes } from "@counterfactual/types";
import { ethers } from "ethers";
import HashZero from "ethers/constants";
import fs from "fs";
import fetch from "node-fetch";
import path from "path";
import { v4 as generateUUID } from "uuid";

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

// const STATE_ENCODING = `
//       tuple(
//         address[2] playerAddrs,
//         uint8 stage,
//         bytes32 salt,
//         bytes32 commitHash,
//         uint256 playerFirstNumber,
//         uint256 playerSecondNumber
//       )
//     `;
// const ACTION_ENCODING = `
//     tuple(
//         uint8 actionType,
//         uint256 number,
//         bytes32 actionHash,
//       )
//     `;

// const BOT_USER = {
//   attributes: {
//     email: "HighRollerBot@counterfactual.com",
//     ethAddress: "0xdab32c06dab94feae04ebd7a54128bc22115eb51",
//     multisigAddress: "0x02D91A30ecCfa50cD8A72177C34E4f282A1b00d2",
//     nodeAddress:
//       "xpub6E36zmy9v3oujanBNnDnDY412eiXGuoXSTFStYmsn1TJ7sQdKrdmud6kEckat1A3y4DsLWdV33SigC15MakedwvmSCCKWNRCHkekPvQNPdb",
//     username: "HighRollerBot"
//   },
//   id: "b7605fb6-a760-4be6-b6c5-a53b54d9d4ec",
//   relationships: {},
//   type: "user"
// };

// const APP = {
//   web3Provider: ethers.getDefaultProvider("ropsten"),
//   contracts: {}
// };

const settingsPath = path.resolve(__dirname, "settings.json");
let node: Node;

(async () => {
  console.log("Creating store");
  const store = serviceFactory.createStoreService("highRollerBotStore1");
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
  const settings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
  if (settings["token"]) {
    await afterUser(node);
  } else {
    try {
      const user = {
        email: "HighRollerBot",
        ethAddress: "0xdab32c06dab94feae04ebd7a54128bc22115eb51",
        nodeAddress: node.publicIdentifier,
        username: "HighRollerBot"
      };
      const privateKey = settings["privateKey"];
      if (!privateKey) {
        throw Error('No private key specified in "settings.json". Exiting.');
      }
      const wallet = new ethers.Wallet(privateKey, provider);
      const signature = await wallet.signMessage(
        buildRegistrationSignaturePayload(user)
      );

      const createdAccount = await createAccount(user, signature);
      settings["token"] = createdAccount.token;
      console.log("Account created. Fetching multisig address");
      const multisigAddress = await fetchMultisig(createdAccount.token!);

      console.log(`Account created with token: ${createdAccount.token}`);

      let depositAmount = process.argv[2];
      if (!depositAmount) {
        depositAmount = "0.01";
      }
      await deposit(depositAmount, multisigAddress);

      // save token to settings after user & channel are  successfully created and funded
      fs.writeFileSync(settingsPath, JSON.stringify(settings));

      await afterUser(node);
    } catch (e) {
      console.error("\n");
      console.error(e);
      console.error("\n");
      process.exit(1);
    }
  }
})();

const delay = ms => new Promise(res => setTimeout(res, ms));

async function fetchMultisig(token: string) {
  bot = await getUser(token);
  if (!bot.multisigAddress) {
    console.info(
      "The Bot doesn't have a channel with the Playground yet...Waiting for another 2.5 seconds"
    );
    await delay(2500).then(() => fetchMultisig(token));
  }
  console.info("Got multisig address: ", bot.multisigAddress);
  return bot.multisigAddress;
}

async function deposit(amount: string, multisigAddress: string) {
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

  node.on("proposeInstallVirtualEvent", async data => {
    try {
      const appInstanceId = data.data.appInstanceId;
      const intermediaries = data.data.params.intermediaries;
      console.log(
        `Received appInstanceId ${appInstanceId} and intermediaries ${intermediaries}`
      );

      console.log(data);

      const request = {
        type: "installVirtual",
        params: {
          appInstanceId,
          intermediaries
        },
        requestId: generateUUID()
      };

      const installedApp = (await node.call("installVirtual", request)).result;

      // const appInstance = await cfProvider.installVirtual(
      //   appInstanceId,
      //   intermediaries
      // );

      console.log("Create event listener for updateState");
      installedApp.appInstance.on("updateState", ({ data }) => {
        console.log(`Received newState ${data}`);
        const newStateArray = data.newState;

        // FIXME: ensure this state is correct
        const state = {
          playerAddrs: newStateArray[0],
          stage: newStateArray[1],
          salt: newStateArray[2],
          commitHash: newStateArray[3],
          playerFirstNumber: newStateArray[4],
          playerSecondNumber: newStateArray[5]
        };

        console.log(`State ${state}`);

        if (state.stage === 2) {
          // Stage.COMMITTING_NUM
          const numToCommit = Math.floor(Math.random() * Math.floor(1000));

          const commitHashAction = {
            number: numToCommit,
            actionType: 2, // ActionType.COMMIT_TO_NUM
            actionHash: HashZero
          };

          console.log("commit hash action");
          console.log(commitHashAction);

          // FIXME: get access to `appInstance` to takeAction
          // this.appInstance.takeAction(commitHashAction);
        }
      });
    } catch (error) {
      console.log(error);
    }
  });
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
