import { Context } from "koa";

import { createMultisigFor } from "../node";
import {
  ApiResponse,
  CreateAccountRequest,
  CreateAccountResponseData,
  ErrorCode
} from "../types";

function validateRequest(params: CreateAccountRequest): ApiResponse {
  if (!params.username) {
    return {
      ok: false,
      error: {
        status: 400,
        errorCode: ErrorCode.UsernameRequired
      }
    };
  }

  if (!params.email) {
    return {
      ok: false,
      error: {
        status: 400,
        errorCode: ErrorCode.EmailRequired
      }
    };
  }

  if (!params.address) {
    return {
      ok: false,
      error: {
        status: 400,
        errorCode: ErrorCode.AddressRequired
      }
    };
  }

  // TODO: Add signature check.

  return { ok: true };
}

export default function createAccount() {
  return async (ctx: Context, next: () => Promise<void>) => {
    const request = ctx.request.body as CreateAccountRequest;

    // Check that all required data is available.
    const response = validateRequest(request);

    if (!response.ok) {
      // Return a HTTP error if something's missing.
      ctx.body = response;
      if (response.error) {
        ctx.status = response.error.status;
      }
      return next();
    }

    // Create the multisig and return its address.
    const multisig = await createMultisigFor(request.address);

    response.data = {
      ...response.data,
      ...multisig
    } as CreateAccountResponseData;

    ctx.status = 201;
    ctx.body = response;
    return next();
  };
}
