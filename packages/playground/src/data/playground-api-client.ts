import {
  APIError,
  APIRequest,
  APIResource,
  APIResourceAttributes,
  APIResourceCollection,
  APIResponse,
  AppAttributes,
  AppDefinition,
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

async function post(
  endpoint: string,
  data: APIResource,
  token?: string,
  authType: "Bearer" | "Signature" = "Signature"
): Promise<APIResponse> {
  const requestTimeout = timeout();

  const httpResponse = await fetch(`${BASE_URL}/api/${endpoint}`, {
    body: JSON.stringify({
      data
    } as APIRequest),
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...(token ? { Authorization: `${authType} ${token}` } : {})
    },
    method: "POST"
  });

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
  public static async createAccount(
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
