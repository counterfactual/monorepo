import { Context } from "koa";
import "koa-body"; // See: https://github.com/dlau/koa-body/issues/109

import { createErrorResponse, createErrorResponseForDatabase } from "../api";
import { matchmakeUser } from "../db";
import {
  ApiResponse,
  ErrorCode,
  MatchmakeRequest,
  MatchmakeResponseData,
  PlaygroundUserData
} from "../types";

function validateRequest(params: MatchmakeRequest): ApiResponse {
  if (!params.userAddress) {
    return createErrorResponse(400, ErrorCode.UserAddressRequired);
  }

  return { ok: true };
}

export default function matchmake() {
  return async (ctx: Context, next: () => Promise<void>) => {
    // TODO: Do we need signature validation here?
    const request = ctx.request.body as MatchmakeRequest;

    // Check that all required data is available.
    const response = validateRequest(request);

    if (!response.ok) {
      // Return a HTTP error if something's missing.
      ctx.body = response;
      if (response.error) {
        ctx.status = response.error.status;
      }
      return next();
    }

    let matchedUser: PlaygroundUserData;

    try {
      matchedUser = await matchmakeUser(request.userAddress);
    } catch (e) {
      ctx.body = createErrorResponseForDatabase(e, ErrorCode.MatchmakeFailed);
      ctx.status = ctx.body.error.status;
      return next();
    }

    response.data = {
      username: matchedUser.username,
      peerAddress: matchedUser.address
    } as MatchmakeResponseData;

    ctx.status = 200;
    ctx.body = response;

    return next();
  };
}
