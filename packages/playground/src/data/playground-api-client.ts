import {
  APIError,
  APIMessageSignature,
  APIRequest,
  APIResource,
  APIResourceCollection,
  APIResponse,
  AppAttributes,
  SessionAttributes,
  UserAttributes,
  UserSession
} from "@counterfactual/playground-server";

import { AppDefinition, UserChangeset } from "../types";

const BASE_URL = `ENV:API_HOST`;

async function post(
  endpoint: string,
  data: APIResource,
  signature?: APIMessageSignature
): Promise<APIResponse> {
  const httpResponse = await fetch(`${BASE_URL}/api/${endpoint}`, {
    body: JSON.stringify({
      data,
      meta: signature
        ? {
            signature
          }
        : {}
    } as APIRequest),
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    method: "POST"
  });

  const response = (await httpResponse.json()) as APIResponse;

  if (response.errors) {
    const error = response.errors[0] as APIError;
    throw error;
  }

  return response;
}

async function get(endpoint: string, token?: string): Promise<APIResponse> {
  const httpResponse = await fetch(`${BASE_URL}/api/${endpoint}`, {
    method: "GET",
    headers: token
      ? {
          Authorization: `Bearer ${token}`
        }
      : {}
  });

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
    signature: APIMessageSignature
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
    signature: APIMessageSignature
  ): Promise<UserSession> {
    try {
      const json = (await post(
        "session",
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
    try {
      const json = (await get("users", token)) as APIResponse;
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
}
