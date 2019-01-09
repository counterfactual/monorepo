import { getAddress, verifyMessage } from "ethers/utils";
import { Context } from "koa";
import "koa-body"; // Needed for ctx.request.body to be detected by TS, see: https://github.com/dlau/koa-body/issues/109

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
    throw ErrorCode.UsernameRequired;
  }

  if (!params.email) {
    throw ErrorCode.EmailRequired;
  }

  if (!params.address) {
    throw ErrorCode.AddressRequired;
  }

  if (!params.signature) {
    throw ErrorCode.SignatureRequired;
  }

  const providedSignature = params.signature;
  const providedAddress = getAddress(params.address);
  const expectedMessage = buildSignaturePayload(params);
  const expectedAddress = verifyMessage(expectedMessage, providedSignature);

  if (providedAddress !== expectedAddress) {
    throw ErrorCode.InvalidSignature;
  }

  return { ok: true };
}

export default function createAccount() {
  return async (ctx: Context, next: () => Promise<void>) => {
    const request = ctx.request.body as CreateAccountRequest;

    // Check that all required data is available.
    const response = validateRequest(request);

    // Create the multisig and return its address.
    const multisig = await createMultisigFor(request.address);

    // Create the Playground User.
    const user: PlaygroundUser = await createUser({
      username: request.username,
      address: request.address,
      email: request.email,
      multisigAddress: multisig.multisigAddress
    });

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
