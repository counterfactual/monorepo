export type UserSession = UserAttributes & { id: string };

export type AuthenticatedRequest = {
  headers: {
    authorization: string;
  };
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

// Exposed models.
export type APIResourceType =
  | "users"
  | "matchmaking"
  | "matchedUser"
  | "session"
  | "apps";

// Model definitions.
export type UserAttributes = MatchedUserAttributes & {
  email: string;
  multisigAddress: string;
  token?: string;
};

export type SessionAttributes = {
  ethAddress: string;
};

export type MatchedUserAttributes = {
  id: string;
  username: string;
  ethAddress: string;
  nodeAddress: string;
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
