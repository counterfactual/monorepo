const apiBasePath = location.href.includes("localhost")
  ? "http://localhost:9000/api"
  : "/.netlify/functions/api";

type StringHashMap = { [key: string]: string | StringHashMap };

async function getToken() {
  return (await callApi("token", {}, true)).token;
}

async function callApi(
  method: string,
  params: StringHashMap = {},
  isPublicApi: boolean = false
) {
  let token = window.localStorage.getItem("playground:token");

  if (!token && !isPublicApi) {
    token = await getToken();
  }

  const execute = async (): Promise<Response> =>
    await fetch(`${apiBasePath}/${method}`, {
      headers: {
        "Content-Type": "application/json",
        ...(isPublicApi ? {} : { Authorization: `Bearer ${token}` })
      },
      cache: "no-store",
      ...params
    });

  let response: Response;

  try {
    response = await execute();

    if (response.status === 205) {
      token = await getToken();
      response = await execute();
    }

    const json = await response.json();

    if (json.token) {
      window.localStorage.setItem("playground:token", json.token);
    }

    return json;
  } catch (e) {
    if (method !== "token") {
      await getToken();
      return await callApi(method, {}, false);
    }

    throw e;
  }
}

export type FirebaseConfigurationResponse = {
  apiKey: string;
  authDomain: string;
  databaseURL: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
};

export default class PlaygroundApi {
  static async getFirebaseConfiguration(): Promise<
    FirebaseConfigurationResponse
  > {
    return await callApi("firebase");
  }
}
