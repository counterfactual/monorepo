import { Address } from "@counterfactual/types";

export type CreateAccountRequest = {
  username: string;
  email: string;
  address: Address;
  signature?: string;
};

export type ErrorResponse = {
  status: number;
  errorCode: ErrorCode;
};

export enum ErrorCode {
  UsernameRequired = "username_required",
  EmailRequired = "email_required",
  AddressRequired = "address_required",
  InvalidSignature = "invalid_signature"
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
  multisigAddress: Address;
};
