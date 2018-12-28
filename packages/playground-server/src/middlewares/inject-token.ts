import { sign } from "jsonwebtoken";
import { Context } from "koa";
import unless from "koa-unless";

import { ConditionalMiddleware } from "../types";

export default function injectToken(jwtSecret: string): ConditionalMiddleware {
  const middleware = async function(
    this: ConditionalMiddleware,
    ctx: Context,
    next: () => Promise<any>
  ) {
    ctx.body = {
      ...ctx.body,
      token: sign(ctx.body || {}, jwtSecret, { expiresIn: "5s" })
    };
    return next();
  };

  middleware.unless = unless;

  return middleware;
}
