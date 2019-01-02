import { verifyMessage } from "ethers/utils";
import { Context } from "koa";
import "koa-body"; // See: https://github.com/dlau/koa-body/issues/109

import { createMultisigFor } from "../node";
import {
  ApiResponse,
  CreateAccountRequest,
  CreateAccountResponseData,
  ErrorCode
} from "../types";

function buildSignaturePayload(data: CreateAccountRequest) {
  return [
    "PLAYGROUND ACCOUNT REGISTRATION",
    `Username: ${data.username}`,
    `E-mail: ${data.email}`,
    `Ethereum address: ${data.address}`
  ].join("\n");
}

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

  if (!params.signature) {
    return {
      ok: false,
      error: {
        status: 400,
        errorCode: ErrorCode.SignatureRequired
      }
    };
  }

  const providedSignature = params.signature;
  const expectedMessage = buildSignaturePayload(params);
  const expectedAddress = verifyMessage(expectedMessage, providedSignature);

  if (
    // We compare the addresses case-insensitively.
    // verifyMessage() returns mixed upper and lower case characters,
    // while eth.accounts[0] always returns lower-case characters.
    params.address.localeCompare(expectedAddress, "en", {
      sensitivity: "base"
    }) !== 0
  ) {
    return {
      ok: false,
      error: {
        status: 403,
        errorCode: ErrorCode.InvalidSignature
      }
    };
  }

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
