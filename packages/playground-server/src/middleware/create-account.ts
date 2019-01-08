import { getAddress, verifyMessage } from "ethers/utils";
import { Context } from "koa";
import "koa-body"; // See: https://github.com/dlau/koa-body/issues/109

import { createErrorResponse, createErrorResponseForDatabase } from "../api";
import { createUser } from "../db";
import { createMultisigFor } from "../node";
import {
  ApiResponse,
  CreateAccountRequest,
  CreateAccountResponseData,
  ErrorCode,
  PlaygroundUser,
  PlaygroundUserData
} from "../types";

function buildSignaturePayload(data: PlaygroundUserData) {
  return [
    "PLAYGROUND ACCOUNT REGISTRATION",
    `Username: ${data.username}`,
    `E-mail: ${data.email}`,
    `Ethereum address: ${data.address}`
  ].join("\n");
}

function validateRequest(params: CreateAccountRequest): ApiResponse {
  if (!params.username) {
    return createErrorResponse(400, ErrorCode.UsernameRequired);
  }

  if (!params.email) {
    return createErrorResponse(400, ErrorCode.EmailRequired);
  }

  if (!params.address) {
    return createErrorResponse(400, ErrorCode.AddressRequired);
  }

  if (!params.signature) {
    return createErrorResponse(400, ErrorCode.SignatureRequired);
  }

  const providedSignature = params.signature;
  const providedAddress = getAddress(params.address);
  const expectedMessage = buildSignaturePayload(params);
  const expectedAddress = verifyMessage(expectedMessage, providedSignature);

  if (providedAddress !== expectedAddress) {
    return createErrorResponse(403, ErrorCode.InvalidSignature);
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

    // Create the Playground User.
    let user: PlaygroundUser;

    try {
      user = await createUser({
        username: request.username,
        address: request.address,
        email: request.email,
        multisigAddress: multisig.multisigAddress
      });
    } catch (e) {
      ctx.body = createErrorResponseForDatabase(e, ErrorCode.UserSaveFailed);
      ctx.status = ctx.body.error.status;
      return next();
    }

    response.data = {
      ...response.data,
      ...multisig,
      user
    } as CreateAccountResponseData;

    ctx.status = 201;
    ctx.body = response;

    return next();
  };
}
