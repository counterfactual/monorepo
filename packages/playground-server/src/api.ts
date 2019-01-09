import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import path from "path";

// TODO: Refactor this. The only real middleware here is "handleError",
// the rest are controllers.
import { createAccount, getApps, handleError, matchmake } from "./middleware";

export default function mountApi() {
  const api = new Koa();

  const router = new Router({ prefix: "/api" });

  router.post("/create-account", createAccount());
  router.post("/matchmake", matchmake());

  router.get("/apps", getApps(path.resolve(__dirname, "../registry.json")));

  api
    .use(handleError(api))
    .use(bodyParser({ json: true }))
    .use(router.routes())
    .use(cors());

  return api;
}
