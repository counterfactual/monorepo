import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";

import { createAccount } from "./middleware";

export default function mountApi() {
  const api = new Koa();

  const router = new Router({ prefix: "/api" });

  router.post("/create-account", createAccount());

  api
    .use(bodyParser({ json: true }))
    .use(router.routes())
    .use(cors());

  return api;
}
