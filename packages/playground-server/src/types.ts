import { IRouterContext } from "koa-router";

export enum HttpStatusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  InternalServerError = 500
}

export enum ControllerMethod {
  GetById,
  GetAll,
  Post
}

export type UserSession = UserAttributes & { id: string };

export type AuthenticatedRequest = {
  headers: {
    authorization: string;
  };
};

export type Middleware = (
  ctx: IRouterContext,
  next: () => Promise<void>
) => Promise<void>;

export type MiddlewareCollection = Middleware[];

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
  InvalidToken = "invalid_token",
  UsernameAlreadyExists = "username_already_exists"
}

// Generic types for JSONAPI document structure.

export type APIResource<T = APIResourceAttributes> = {
  type: APIResourceType;
  id?: string;
  attributes: T;
  relationships?: { [key in APIResourceType]?: APIDataContainer };
};

export type APIResourceCollection<T = APIResourceAttributes> = APIResource<T>[];

export type APIMetadata = {
  signature: APIMessageSignature;
};

export type APIMessageSignature = {
  signedMessage: string;
};

export type APIDataContainer<T = APIResourceAttributes> = {
  data: APIResource<T> | APIResourceCollection<T>;
};

export type APIResponse = APIDataContainer & {
  errors?: APIError[];
  meta?: APIMetadata;
  included?: APIResourceCollection;
};

export type APIRequest<T = APIResourceAttributes> = {
  data?: APIResource<T> | APIResourceCollection<T>;
  meta?: APIMetadata;
};

export type APIError = {
  status: HttpStatusCode;
  code: ErrorCode;
  title: string;
  detail: string;
};

// Exposed models.
export type APIResourceType =
  | "users"
  | "matchmaking"
  | "matchedUser"
  | "session"
  | "apps";

export type APIResourceAttributes = {
  [key: string]: string | number | boolean | undefined;
};

// Model definitions.
export type UserAttributes = MatchedUserAttributes & {
  email: string;
  multisigAddress: string;
  nodeAddress: string;
  token?: string;
};

export type SessionAttributes = {
  ethAddress: string;
};

export type MatchedUserAttributes = {
  id: string;
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
