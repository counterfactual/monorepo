import { User } from "../store/types";

type APIResourceType =
  | "user"
  | "matchmakingRequest"
  | "matchedUser"
  | "session"
  | "app"
  | "multisigDeploy";

type APIError = {
  status: HttpStatusCode;
  code: ErrorCode;
  title: string;
  detail: string;
};

type APIResource<T = APIResourceAttributes> = {
  type: APIResourceType;
  id?: string;
  attributes: T;
  relationships?: APIResourceRelationships;
};

type APIResourceAttributes = {
  [key: string]: string | number | boolean | undefined;
};

type APIResourceRelationships = { [key in APIResourceType]?: APIDataContainer };

type APIDataContainer<T = APIResourceAttributes> = {
  data: APIResource<T> | APIResourceCollection<T>;
};

type APIResourceCollection<T = APIResourceAttributes> = APIResource<T>[];

type APIResponse<T = APIResourceAttributes> = APIDataContainer<T> & {
  errors?: APIError[];
  meta?: APIMetadata;
  included?: APIResourceCollection;
};

enum ErrorCode {
  SignatureRequired = "signature_required",
  InvalidSignature = "invalid_signature",
  AddressAlreadyRegistered = "address_already_registered",
  ChallengeRegistryNotAvailable = "app_registry_not_available",
  UserAddressRequired = "user_address_required",
  NoUsersAvailable = "no_users_available",
  UnhandledError = "unhandled_error",
  UserNotFound = "user_not_found",
  TokenRequired = "token_required",
  InvalidToken = "invalid_token",
  UsernameAlreadyExists = "username_already_exists"
}

export const CounterfactualErrorCodeDetail = {
  signature_required: {
    code: "signature_required",
    message: "A Signature is required",
    field: ""
  },
  invalid_signature: {
    code: "invalid_signature",
    message: "Ups, something is wrong with the signature",
    field: ""
  },
  address_already_registered: {
    code: "address_already_registered",
    message: "The address has already been registered",
    field: "email"
  },
  app_registry_not_available: {
    code: "app_registry_not_available",
    message: "The registry is not available right now",
    field: ""
  },
  user_address_required: {
    code: "user_address_required",
    message: "The user address is required for this operation",
    field: "email"
  },
  no_users_available: {
    code: "no_users_available",
    message: "No users are available",
    field: ""
  },
  unhandled_error: {
    code: "unhandled_error",
    message: "Something broke! Error not handled",
    field: ""
  },
  user_not_found: {
    code: "user_not_found",
    message: "The user is just not there",
    field: ""
  },
  token_required: {
    code: "token_required",
    message: "A token is required",
    field: ""
  },
  invalid_token: {
    code: "invalid_token",
    message: "Something is wrong with that token",
    field: ""
  },
  username_already_exists: {
    code: "username_already_exists",
    message: "That username already exists, sorry",
    field: "username"
  }
};

export const ErrorDetail = {
  "-32603": CounterfactualErrorCodeDetail.signature_required,
  ...CounterfactualErrorCodeDetail
};

enum HttpStatusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  InternalServerError = 500
}

type APIMetadata = {
  [key: string]: string | number | boolean | APIMetadata;
};

type APIRequest<T = APIResourceAttributes> = {
  data?: APIResource<T> | APIResourceCollection<T>;
  meta?: APIMetadata;
};

const BASE_URL = `http://localhost:9000`;
const API_TIMEOUT = 30000;

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

async function request(
  method: string,
  endpoint: string,
  data: APIResource,
  token?: string,
  authType: "Bearer" | "Signature" = "Signature"
) {
  return await fetch(`${BASE_URL}/api/${endpoint}`, {
    method,
    ...(["POST", "PUT"].includes(method)
      ? {
          body: JSON.stringify({
            data
          } as APIRequest)
        }
      : {}),
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(token ? { Authorization: `${authType} ${token}` } : {})
    }
  });
}

// async function put(
//   endpoint: string,
//   data: APIResource,
//   token: string
// ): Promise<APIResponse> {
//   const requestTimeout = timeout();

//   const httpResponse = await request(
//     "PUT",
//     `${endpoint}/${data.id}`,
//     data,
//     token
//   );

//   requestTimeout.cancel();

//   const response = (await httpResponse.json()) as APIResponse;

//   if (response.errors) {
//     const error = response.errors[0] as APIError;
//     throw error;
//   }

//   return response;
// }

async function post(
  endpoint: string,
  data: APIResource,
  token?: string,
  authType: "Bearer" | "Signature" = "Signature"
): Promise<APIResponse> {
  const requestTimeout = timeout();

  const httpResponse = await request("POST", endpoint, data, token, authType);

  requestTimeout.cancel();

  const response = (await httpResponse.json()) as APIResponse;

  if (response.errors) {
    const error = response.errors[0] as APIError;
    throw error;
  }

  return response;
}

// async function remove(
//   endpoint: string,
//   data: APIResource,
//   token?: string,
//   authType: "Bearer" | "Signature" = "Signature"
// ): Promise<APIResponse> {
//   const requestTimeout = timeout();

//   const httpResponse = await fetch(
//     `${BASE_URL}/api/${endpoint}/${data.attributes.id}`,
//     {
//       method: "DELETE",
//       headers: {
//         "Content-Type": "application/json; charset=utf-8",
//         Authorization: `${authType} ${token}`
//       }
//     }
//   );

//   requestTimeout.cancel();

//   const response = (await httpResponse.json()) as APIResponse;

//   if (response.errors) {
//     const error = response.errors[0] as APIError;
//     throw error;
//   }

//   return response;
// }

// async function get(endpoint: string, token?: string): Promise<APIResponse> {
//   const requestTimeout = timeout();

//   const httpResponse = await request(
//     "GET",
//     endpoint,
//     {} as APIResource<APIResourceAttributes>,
//     token,
//     "Bearer"
//   );

//   requestTimeout.cancel();

//   const response = (await httpResponse.json()) as APIResponse;

//   if (response.errors) {
//     const error = response.errors[0] as APIError;
//     throw error;
//   }

//   return response;
// }

// function fromAPIResource<TModel, TResource>(
//   resource: APIResource<TResource>
// ): TModel {
//   return ({
//     id: resource.id,
//     ...(resource.attributes as {})
//   } as unknown) as TModel;
// }

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

export default class PlaygroundAPIClient {
  public static async createAccount(
    user: User,
    signature: string
  ): Promise<User> {
    try {
      const data = toAPIResource<User, User>(user);
      const json = (await post("users", data, signature)) as APIResponse;
      const resource = json.data as APIResource<User>;

      const jsonMultisig = (await post("multisig-deploys", {
        type: "multisigDeploy",
        attributes: { ethAddress: user.ethAddress }
      })) as APIResponse;
      const resourceMultisig = jsonMultisig.data as APIResource<Partial<User>>;

      resource.attributes.transactionHash = resourceMultisig.id as string;

      return {
        ...user,
        ...(json.data as APIResource).attributes
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  // public static async updateAccount(user: UserChangeset): Promise<UserSession> {
  //   try {
  //     const data = toAPIResource<UserChangeset, UserAttributes>(user);
  //     const json = (await put("users", data, window.localStorage.getItem(
  //       "playground:user:token"
  //     ) as string)) as APIResponse;
  //     const resource = json.data as APIResource<UserAttributes>;

  //     return fromAPIResource<UserSession, UserAttributes>(resource);
  //   } catch (e) {
  //     return Promise.reject(e);
  //   }
  // }

  // public static async deleteAccount(user: UserChangeset): Promise<void> {
  //   try {
  //     const data = toAPIResource<UserChangeset, UserAttributes>(user);
  //     await remove("users", data, window.localStorage.getItem(
  //       "playground:user:token"
  //     ) as string);
  //   } catch (e) {
  //     return Promise.reject(e);
  //   }
  // }

  public static async login(
    ethAddress: string,
    signature: string
  ): Promise<User> {
    try {
      const json = (await post(
        "session-requests",
        {
          type: "session",
          id: "",
          attributes: {
            ethAddress
          }
        } as APIResource,
        signature
      )) as APIResponse;
      return {
        id: (json.data as APIResource).id,
        ...((json.data as APIResource).attributes as User)
      };
    } catch (e) {
      return Promise.reject(e);
    }
  }

  // public static async getUser(token: string): Promise<UserSession> {
  //   if (!token) {
  //     throw new Error("getUser(): token is required");
  //   }

  //   try {
  //     const json = (await get("users/me", token)) as APIResponse;
  //     const resource = json.data[0] as APIResource<UserAttributes>;

  //     return fromAPIResource<UserSession, UserAttributes>(resource);
  //   } catch (e) {
  //     return Promise.reject(e);
  //   }
  // }

  // public static async getUserByNodeAddress(
  //   ethAddress: string
  // ): Promise<UserSession> {
  //   try {
  //     const json = (await get(
  //       `users?filter[node_address]=${ethAddress}`
  //     )) as APIResponse;
  //     const resource = json.data[0] as APIResource<UserAttributes>;

  //     return fromAPIResource<UserSession, UserAttributes>(resource);
  //   } catch (e) {
  //     return Promise.reject(e);
  //   }
  // }

  // public static async getApps(): Promise<AppDefinition[]> {
  //   try {
  //     const json = (await get("apps")) as APIResponse;
  //     const resources = json.data as APIResourceCollection<AppAttributes>;

  //     return resources.map(resource =>
  //       fromAPIResource<AppDefinition, AppAttributes>(resource)
  //     );
  //   } catch (e) {
  //     return Promise.reject(e);
  //   }
  // }

  // public static async matchmake(token: string, matchmakeWith: string | null) {
  //   try {
  //     return await post(
  //       "matchmaking-requests",
  //       {
  //         type: "matchmakingRequest",
  //         attributes: matchmakeWith ? { matchmakeWith } : {}
  //       },
  //       token,
  //       "Bearer"
  //     );
  //   } catch (e) {
  //     return Promise.reject(e);
  //   }
  // }
}
