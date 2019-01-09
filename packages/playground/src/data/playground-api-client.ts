import {
  ApiResponse,
  CreateAccountRequest,
  CreateAccountResponseData,
  ErrorResponse,
  GetAppsResponseData,
  PlaygroundAppDefinition
} from "@counterfactual/playground-server";

const BASE_URL = `ENV:API_HOST`;

type JsonBody = {
  [key: string]: string | number | boolean | JsonBody | undefined;
};

async function post(endpoint: string, body: JsonBody): Promise<ApiResponse> {
  const httpResponse = await fetch(`${BASE_URL}/api/${endpoint}`, {
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json; charset=utf-8"
    },
    method: "POST"
  });

  const response = (await httpResponse.json()) as ApiResponse;

  if (!response.ok) {
    const error = response.error as ErrorResponse;
    throw error;
  }

  return response;
}

async function get(endpoint: string): Promise<ApiResponse> {
  const httpResponse = await fetch(`${BASE_URL}/api/${endpoint}`, {
    method: "GET"
  });

  const response = (await httpResponse.json()) as ApiResponse;

  if (!response.ok) {
    const error = response.error as ErrorResponse;
    throw error;
  }

  return response;
}

export default class PlaygroundAPIClient {
  public static async createAccount(
    data: CreateAccountRequest
  ): Promise<CreateAccountResponseData> {
    try {
      return (await post("create-account", data))
        .data as CreateAccountResponseData;
    } catch (e) {
      return Promise.reject(e);
    }
  }

  public static async getApps(): Promise<PlaygroundAppDefinition[]> {
    try {
      return ((await get("apps")).data as GetAppsResponseData).apps;
    } catch (e) {
      // TODO: This backup registry is temporary until we deploy the Playground Server.
      return [
        {
          name: "High Roller",
          url: "https://high-roller-staging.counterfactual.com",
          slug: "high-roller",
          icon: "assets/images/logo.svg"
        },
        {
          name: "Tic Tac Toe",
          url: "https://tic-tac-toe-staging.netlify.com",
          slug: "tic-tac-toe",
          icon: "public/images/logo-blue.svg"
        }
      ];
    }
  }
}
