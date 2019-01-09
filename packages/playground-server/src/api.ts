import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import path from "path";

// API Controllers
import createAccount from "./controllers/create-account";
import getApps from "./controllers/get-apps";
import login from "./controllers/login";
import matchmake from "./controllers/matchmake";
// Middlewares
import authentication from "./middleware/authentication";
import errorHandler from "./middleware/error";
import signatureValidator from "./middleware/signature";

export default function mountApi() {
  const api = new Koa();

  const router = new Router({ prefix: "/api" });

  router.post("/create-account", createAccount());
  router.post("/login", login());

  // TODO: Protect this route!
  router.post("/matchmake", matchmake());

  router.get("/apps", getApps(path.resolve(__dirname, "../registry.json")));

  api
    .use(errorHandler(api))
    .use(bodyParser({ json: true }))
    .use(signatureValidator())
    .use(authentication("/api/matchmake"))
    .use(router.routes())
    .use(cors());

  return api;
}
