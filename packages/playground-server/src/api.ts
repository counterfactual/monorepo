import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import path from "path";

import { createAccount, getApps } from "./middleware";
import { ApiResponse, ErrorCode } from "./types";

export default function mountApi() {
  const api = new Koa();

  const router = new Router({ prefix: "/api" });

  router.post("/create-account", createAccount());
  router.get("/apps", getApps(path.resolve(__dirname, "../registry.json")));

  api
    .use(bodyParser({ json: true }))
    .use(router.routes())
    .use(cors());

  return api;
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
