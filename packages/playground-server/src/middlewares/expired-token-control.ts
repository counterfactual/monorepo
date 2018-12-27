import { Context } from "koa";

export default function expiredTokenControl() {
  return async function(ctx: Context, next: () => Promise<any>) {
    return next().catch(err => {
      if (err.status === 401) {
        ctx.status = 205;
        ctx.body = { error: "TOKEN_EXPIRED" };
      } else {
        throw err;
      }
    });
  };
}
