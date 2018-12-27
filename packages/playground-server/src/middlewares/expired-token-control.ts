import { Context } from "koa";

export default function expiredTokenControl() {
  return async function(ctx: Context, next: () => Promise<any>) {
    return next().catch(err => {
      if (401 === err.status) {
        ctx.status = 205;
        ctx.body = { error: "TOKEN_EXPIRED" };
      } else {
        throw err;
      }
    });
  };
}
