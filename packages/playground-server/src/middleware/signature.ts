import { getAddress, verifyMessage } from "ethers/utils";
import { Context } from "koa";
import "koa-body"; // Needed for ctx.request.body to be detected by TS, see: https://github.com/dlau/koa-body/issues/109

import {
  CreateAccountRequest,
  ErrorCode,
  LoginRequest,
  SignedRequest,
  TypedRequest
} from "../types";

// TODO: This should be pushed from each route.
const buildPayloadFor: {
  [path: string]: (request: TypedRequest) => string;
} = {
  "/api/login": ({ body }: TypedRequest<LoginRequest>) =>
    ["PLAYGROUND ACCOUNT LOGIN", `Ethereum address: ${body.address}`].join(
      "\n"
    ),

  "/api/create-account": ({ body }: TypedRequest<CreateAccountRequest>) =>
    [
      "PLAYGROUND ACCOUNT REGISTRATION",
      `Username: ${body.username}`,
      `E-mail: ${body.email}`,
      `Ethereum address: ${body.address}`
    ].join("\n")
};

export default function signatureValidator() {
  return async (ctx: Context, next: () => Promise<void>) => {
    const body = ctx.request.body as SignedRequest;

    if (!(ctx.path in buildPayloadFor)) {
      // It's not a signed request. Don't do anything with it.
      return next();
    }

    if (!("signature" in body)) {
      throw ErrorCode.SignatureRequired;
    }

    const expectedMessage = buildPayloadFor[ctx.path](
      ctx.request as TypedRequest
    );
    const providedSignature = body.signature;
    const providedAddress = getAddress(body.address);
    const expectedAddress = verifyMessage(expectedMessage, providedSignature);

    if (providedAddress !== expectedAddress) {
      throw ErrorCode.InvalidSignature;
    }

    return next();
  };
}
