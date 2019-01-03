import { Address } from "@counterfactual/types";

export type CreateAccountRequest = PlaygroundUserData & {
  signature: string;
};

export type ErrorResponse = {
  status: number;
  errorCode: ErrorCode;
};

export enum ErrorCode {
  UsernameRequired = "username_required",
  EmailRequired = "email_required",
  AddressRequired = "address_required",
  SignatureRequired = "signature_required",
  InvalidSignature = "invalid_signature",
  UserSaveFailed = "user_save_failed",
  AddressAlreadyRegistered = "address_already_registered"
}

export type ApiResponse = {
  error?: ErrorResponse;
  ok: boolean;
  data?:
    | CreateAccountResponseData
    | {
        /* other types */
      };
};

export type CreateAccountResponseData = {
  user: PlaygroundUser;
  multisigAddress: Address;
};

export type PlaygroundUserData = {
  email: string;
  username: string;
  address: Address;
  multisigAddress: Address;
};

export type PlaygroundUser = PlaygroundUserData & { id: string };
