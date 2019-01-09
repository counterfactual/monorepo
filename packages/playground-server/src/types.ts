import { Address } from "@counterfactual/types";
import { Context, Request } from "koa";

export enum HttpStatusCode {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  Forbidden = 403,
  InternalServerError = 500
}

// `any` is needed since `ctx.request.body` is typed like that.
export type TypedRequest<T = any> = Request & { body: T };

export type SignedRequest = {
  address: string;
  signature: string;
};

export type CreateAccountRequest = PlaygroundUserData & SignedRequest;

export type LoginRequest = SignedRequest;

export type MatchmakeResponseData = {
  username: string;
  peerAddress: Address;
};

export type ErrorResponse = {
  status: number;
  errorCode: ErrorCode;
  context?: Error;
};

export type StatusCodeMapping = Map<ErrorCode | "default", number>;

export enum ErrorCode {
  UsernameRequired = "username_required",
  EmailRequired = "email_required",
  AddressRequired = "address_required",
  SignatureRequired = "signature_required",
  InvalidSignature = "invalid_signature",
  AddressAlreadyRegistered = "address_already_registered",
  AppRegistryNotAvailable = "app_registry_not_available",
  UserAddressRequired = "user_address_required",
  NoUsersAvailable = "no_users_available",
  UnhandledError = "unhandled_error"
}

export type ApiResponse = {
  error?: ErrorResponse;
  ok: boolean;
  data?:
    | CreateAccountResponseData
    | GetAppsResponseData
    | MatchmakeResponseData;
};

export type CreateAccountResponseData = {
  user: PlaygroundUser;
  multisigAddress: Address;
};

export type PlaygroundAppDefinition = {
  name: string;
  slug: string;
  url: string;
  icon: string;
};

export type GetAppsResponseData = {
  apps: PlaygroundAppDefinition[];
};

export type PlaygroundUserData = {
  email: string;
  username: string;
  address: Address;
};

export type MatchmakeUserData = {
  username: string;
  address: Address;
};

export type PlaygroundUser = PlaygroundUserData & {
  id: string;
  multisigAddress: Address;
};
