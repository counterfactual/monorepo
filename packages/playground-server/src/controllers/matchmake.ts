import { Context } from "koa";
import "koa-body"; // Needed for ctx.request.body to be detected by TS, see: https://github.com/dlau/koa-body/issues/109

import { matchmakeUser } from "../db";
import {
  ApiResponse,
  ErrorCode,
  MatchmakeRequest,
  MatchmakeResponseData,
  MatchmakeUserData
} from "../types";

function validateRequest(params: MatchmakeRequest): ApiResponse {
  if (!params.userAddress) {
    throw ErrorCode.UserAddressRequired;
  }

  return { ok: true };
}

export default function matchmake() {
  return async (ctx: Context, next: () => Promise<void>) => {
    // TODO: Implement authentication.
    const request = ctx.request.body as MatchmakeRequest;

    // Check that all required data is available.
    const response = validateRequest(request);
    const matchedUser: MatchmakeUserData = await matchmakeUser(
      request.userAddress
    );

    response.data = {
      username: matchedUser.username,
      peerAddress: matchedUser.address
    } as MatchmakeResponseData;

    ctx.status = 200;
    ctx.body = response;

    return next();
  };
}
