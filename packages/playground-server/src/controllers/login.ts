import { sign } from "jsonwebtoken";
import { Context } from "koa";
import "koa-body"; // Needed for ctx.request.body to be detected by TS, see: https://github.com/dlau/koa-body/issues/109

import { getUser } from "../db";
import { ApiResponse, HttpStatusCode, LoginRequest } from "../types";

export default function login() {
  return async (ctx: Context, next: () => Promise<void>) => {
    const request = ctx.request.body as LoginRequest;
    const user = await getUser(request.address);

    // TODO: What should we use as the token's secret?
    // TODO: How long will the session last?
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

    ctx.status = HttpStatusCode.OK;
    ctx.body = response;

    return next();
  };
}
