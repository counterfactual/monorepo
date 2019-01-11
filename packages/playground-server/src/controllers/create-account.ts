import { sign } from "jsonwebtoken";
import { Context } from "koa";
import "koa-body"; // Needed for ctx.request.body to be detected by TS, see: https://github.com/dlau/koa-body/issues/109

import { createUser } from "../db";
import { createMultisigFor } from "../node";
import {
  ApiResponse,
  CreateAccountRequest,
  HttpStatusCode,
  PlaygroundUser
} from "../types";

export default function createAccount() {
  return async (ctx: Context, next: () => Promise<void>) => {
    const request = ctx.request.body as CreateAccountRequest;

    // Create the multisig and return its address.
    const multisig = await createMultisigFor(request.address);

    // Create the Playground User.
    const user: PlaygroundUser = await createUser({
      username: request.username,
      address: request.address,
      email: request.email,
      multisigAddress: multisig.multisigAddress
    });

    // Create token.
    const token = sign(user, process.env.NODE_PRIVATE_KEY as string, {
      expiresIn: "1Y"
    });

    const response = {
      ok: true,
      data: {
        user,
        token
      }
    } as ApiResponse;

    ctx.status = HttpStatusCode.Created;
    ctx.body = response;

    return next();
  };
}
