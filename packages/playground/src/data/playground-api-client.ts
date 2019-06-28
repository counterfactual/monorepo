import {
  APIError,
  APIRequest,
  APIResource,
  APIResourceAttributes,
  APIResourceCollection,
  APIResponse,
  AppAttributes,
  AppDefinition,
  Heartbeat,
  SessionAttributes,
  UserAttributes,
  UserChangeset,
  UserSession
} from "../types";

const BASE_URL = `ENV:API_HOST`;
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

async function put(
  endpoint: string,
  data: APIResource,
  token: string
): Promise<APIResponse> {
  const requestTimeout = timeout();

  const httpResponse = await request(
    "PUT",
    `${endpoint}/${data.id}`,
    data,
    token
  );

  requestTimeout.cancel();

  const response = (await httpResponse.json()) as APIResponse;

  if (response.errors) {
    const error = response.errors[0] as APIError;
    throw error;
  }

  return response;
}

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

async function remove(
  endpoint: string,
  data: APIResource,
  token?: string,
  authType: "Bearer" | "Signature" = "Signature"
): Promise<APIResponse> {
  const requestTimeout = timeout();

  const httpResponse = await fetch(
    `${BASE_URL}/api/${endpoint}/${data.attributes.id}`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Authorization: `${authType} ${token}`
      }
    }
  );

  requestTimeout.cancel();

  const response = (await httpResponse.json()) as APIResponse;

  if (response.errors) {
    const error = response.errors[0] as APIError;
    throw error;
  }

  return response;
}

async function get(endpoint: string, token?: string): Promise<APIResponse> {
  const requestTimeout = timeout();

  const httpResponse = await request(
    "GET",
    endpoint,
    {} as APIResource<APIResourceAttributes>,
    token,
    "Bearer"
  );

  requestTimeout.cancel();

  const response = (await httpResponse.json()) as APIResponse;

  if (response.errors) {
    const error = response.errors[0] as APIError;
    throw error;
  }

  return response;
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

export default class PlaygroundAPIClient {
  public static async getHeartbeat(): Promise<Heartbeat> {
    try {
      const json = (await get("heartbeats")) as APIResponse;

      return (json.data as APIResource[])[0].attributes as Heartbeat;
    } catch {
      return {
        schemaVersion: "",
        maintenanceMode: true
      };
    }
  }

  public static async createAccount(
    user: UserChangeset,
    signature: string
  ): Promise<UserSession> {
    try {
      const data = toAPIResource<UserChangeset, UserAttributes>(user);
      const json = (await post("users", data, signature)) as APIResponse;
      const resource = json.data as APIResource<UserAttributes>;

      const jsonMultisig = (await post("multisig-deploys", {
        type: "multisigDeploy",
        attributes: { ethAddress: user.ethAddress }
      })) as APIResponse;

      const resourceMultisig = jsonMultisig.data as APIResource<
        Partial<UserAttributes>
      >;

      resource.attributes.transactionHash = resourceMultisig.id as string;

      return fromAPIResource<UserSession, UserAttributes>(resource);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public static async updateAccount(user: UserChangeset): Promise<UserSession> {
    try {
      const data = toAPIResource<UserChangeset, UserAttributes>(user);
      const json = (await put("users", data, window.localStorage.getItem(
        "playground:user:token"
      ) as string)) as APIResponse;
      const resource = json.data as APIResource<UserAttributes>;

      return fromAPIResource<UserSession, UserAttributes>(resource);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public static async deleteAccount(user: UserChangeset): Promise<void> {
    try {
      const data = toAPIResource<UserChangeset, UserAttributes>(user);
      await remove("users", data, window.localStorage.getItem(
        "playground:user:token"
      ) as string);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public static async login(
    user: SessionAttributes,
    signature: string
  ): Promise<UserSession> {
    try {
      const json = (await post(
        "session-requests",
        {
          type: "session",
          id: "",
          attributes: {
            ethAddress: user.ethAddress
          } as SessionAttributes
        } as APIResource,
        signature
      )) as APIResponse;
      const resource = json.data as APIResource<UserAttributes>;

      return fromAPIResource<UserSession, UserAttributes>(resource);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public static async getUser(token: string): Promise<UserSession> {
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

  public static async getUserByNodeAddress(
    ethAddress: string
  ): Promise<UserSession> {
    try {
      const json = (await get(
        `users?filter[node_address]=${ethAddress}`
      )) as APIResponse;
      const resource = json.data[0] as APIResource<UserAttributes>;

      return fromAPIResource<UserSession, UserAttributes>(resource);
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public static async getApps(): Promise<AppDefinition[]> {
    try {
      const json = (await get("apps")) as APIResponse;
      const resources = json.data as APIResourceCollection<AppAttributes>;

      return resources.map(resource =>
        fromAPIResource<AppDefinition, AppAttributes>(resource)
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public static async matchmake(token: string, matchmakeWith: string | null) {
    try {
      return await post(
        "matchmaking-requests",
        {
          type: "matchmakingRequest",
          attributes: matchmakeWith ? { matchmakeWith } : {}
        },
        token,
        "Bearer"
      );
    } catch (e) {
      return Promise.reject(e);
    }
  }
}
