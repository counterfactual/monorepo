import { Address } from "@counterfactual/types";
import { Signature } from "ethers/utils";

export type CreateAccountRequest = {
  username: string;
  email: string;
  address: Address;
  signature?: Signature;
};

export type ErrorResponse = {
  status: number;
  errorCode: ErrorCode;
};

export enum ErrorCode {
  UsernameRequired = "username_required",
  EmailRequired = "email_required",
  AddressRequired = "address_required"
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
