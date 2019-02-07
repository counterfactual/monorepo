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
  token?: string;
};

export type ComponentEventHandler = (event: CustomEvent<any>) => void;

export interface WidgetDialogSettings {
  title?: string;
  icon?: string;
  content: JSX.Element;
  primaryButtonText: string;
  secondaryButtonText?: string;
  onPrimaryButtonClicked: ComponentEventHandler;
  onSecondaryButtonClicked?: ComponentEventHandler;
}

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
  | "matchmaking-request"
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
