import { HttpStatusCode, JsonApiError } from "@ebryn/jsonapi-ts";

const errors: {
  [key: string]: (
    args?: {
      [key: string]: string | number | boolean;
    }
  ) => JsonApiError;
} = {
  SignatureRequired: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "signature_required"
  }),

  InvalidSignature: (): JsonApiError => ({
    status: HttpStatusCode.BadRequest,
    code: "invalid_signature"
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
