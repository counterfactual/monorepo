import {
  ApiResponse,
  AuthenticatedContext,
  HttpStatusCode,
  PlaygroundUser
} from "../types";

export default function getUser() {
  return async (ctx: AuthenticatedContext, next: () => Promise<void>) => {
    const user = ctx.user as PlaygroundUser;

    ctx.status = HttpStatusCode.OK;
    ctx.body = {
      ok: true,
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          address: user.address,
          multisigAddress: user.multisigAddress
        }
      }
    } as ApiResponse;

    return next();
  };
}
