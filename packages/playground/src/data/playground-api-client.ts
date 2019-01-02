import {
  ApiResponse,
  CreateAccountRequest,
  CreateAccountResponseData,
  ErrorResponse
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
    throw new Error(
      `The Playground API returned a ${error.status} error: ${error.errorCode}`
    );
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
}
