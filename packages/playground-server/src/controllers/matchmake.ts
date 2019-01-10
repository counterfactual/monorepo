import { matchmakeUser } from "../db";
import {
  ApiResponse,
  AuthenticatedContext,
  HttpStatusCode,
  MatchmakeUserData,
  PlaygroundUser
} from "../types";

export default function matchmake() {
  return async (ctx: AuthenticatedContext, next: () => Promise<void>) => {
    const user = ctx.user as PlaygroundUser;
    const matchedUser: MatchmakeUserData = await matchmakeUser(user.address);

    const response = {
      ok: true,
      data: {
        username: matchedUser.username,
        peerAddress: matchedUser.address
      }
    } as ApiResponse;

    ctx.status = HttpStatusCode.OK;
    ctx.body = response;

    return next();
  };
}
