import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import path from "path";

import { createAccount, getApps, matchmake } from "./middleware";
import { ApiResponse, ErrorCode } from "./types";

export default function mountApi() {
  const api = new Koa();

  const router = new Router({ prefix: "/api" });

  router.post("/create-account", createAccount());
  router.post("/matchmake", matchmake());

  router.get("/apps", getApps(path.resolve(__dirname, "../registry.json")));

  api
    .use(bodyParser({ json: true }))
    .use(router.routes())
    .use(cors());

  return api;
}

export function createErrorResponseForDatabase(
  handledError: Error | ErrorCode,
  failureErrorCode: ErrorCode
): ApiResponse {
  // Return 400 for handled errors, 500 for unexpected throws.
  if (!(handledError instanceof Error)) {
    return createErrorResponse(400, handledError as ErrorCode);
  }

  return createErrorResponse(500, failureErrorCode);
}

export function createErrorResponse(
  status: number,
  errorCode: ErrorCode
): ApiResponse {
  return {
    ok: false,
    error: { status, errorCode }
  };
}
