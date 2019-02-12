import { HttpStatusCode, JsonApiError } from "@ebryn/jsonapi-ts";

enum errorTypes {
  SignatureRequired = "SignatureRequired",
  InvalidSignature = "InvalidSignature",
  UsernameRequired = "UsernameRequired",
  EmailRequired = "EmailRequired",
  AddressAlreadyRegistered = "AddressAlreadyRegistered",
  AppRegistryNotAvailable = "AppRegistryNotAvailable",
  UserAddressRequired = "UserAddressRequired",
  NoUsersAvailable = "NoUsersAvailable",
  UnhandledError = "UnhandledError",
  UserNotFound = "UserNotFound",
  TokenRequired = "TokenRequired",
  InvalidToken = "InvalidToken",
  UsernameAlreadyExists = "UsernameAlreadyExists"
}

const errors: {
  [key in errorTypes]: (
    args?: {
      [key: string]: string | number | boolean;
    }
  ) => JsonApiError
} = {
  SignatureRequired: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "signature_required"
  }),

  InvalidSignature: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "invalid_signature"
  }),

  UsernameRequired: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "username_required"
  }),

  EmailRequired: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "email_required"
  }),

  AddressAlreadyRegistered: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "address_already_registered"
  }),

  AppRegistryNotAvailable: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "app_registry_not_available"
  }),

  UserAddressRequired: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "user_address_required"
  }),

  NoUsersAvailable: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "no_users_available"
  }),

  UnhandledError: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "unhandled_error"
  }),

  UserNotFound: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "user_not_found"
  }),

  TokenRequired: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "token_required"
  }),

  InvalidToken: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "invalid_token"
  }),

  UsernameAlreadyExists: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "username_already_exists"
  })
};

export default errors;
