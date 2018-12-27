import { Context } from "koa";

export default function token() {
  return async function(ctx: Context, next: () => Promise<any>) {
    // TODO: This should restrict who can request a JSON Web Token.
    return next();
  };
}
