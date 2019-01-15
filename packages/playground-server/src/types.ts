import { IRouterContext } from "koa-router";

export enum HttpStatusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  InternalServerError = 500
}

export type UserSession = UserAttributes & { id: string };

export type AuthenticatedContext = IRouterContext & { user: UserSession };

export type APIRequestBodyContainer<T = APIResourceAttributes> = {
  body: APIRequest<T>;
};

export type StatusCodeMapping = Map<ErrorCode | "default", HttpStatusCode>;

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
  InvalidToken = "invalid_token"
}

// Generic types for JSONAPI document structure.

export type APIResource<T = APIResourceAttributes> = {
  type: APIResourceType;
  id?: string;
  attributes: T;
  relationships?: { [key in APIResourceType]?: APIDataContainer };
};

export type APIResourceCollection<T = APIResourceAttributes> = APIResource<T>[];

export type APIMetadata = {};

export type APIDataContainer<T = APIResourceAttributes> = {
  data: APIResource<T> | APIResourceCollection<T>;
};

export type APIResponse = APIDataContainer & {
  errors?: APIError[];
  meta?: APIMetadata;
};

export type APIRequest<T = APIResourceAttributes> = APIDataContainer<T>;

export type APIError = {
  status: HttpStatusCode;
  code: ErrorCode;
  title: string;
  detail: string;
};

// Exposed models.
export type APIResourceType = "users" | "matchmaking" | "matchedUser";

export type APIResourceAttributes = {
  [key: string]: string | number | boolean | undefined;
};

// Model definitions.
export type UserAttributes = MatchedUserAttributes & {
  email: string;
  multisigAddress: string;
  token?: string;
};

export type MatchedUserAttributes = {
  username: string;
  ethAddress: string;
};

export type MatchmakingAttributes = {
  intermediary: string;
};

export type AppsControllerOptions = {
  registryPath: string;
};

export type AppRegistryItem = AppAttributes & {
  id: string;
};

export type AppAttributes = {
  name: string;
  slug: string;
  icon: string;
  url: string;
};
