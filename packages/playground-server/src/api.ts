import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import { KoaLoggingMiddleware as logs } from "logepi";
import path from "path";

// API Controllers
import AppsController from "./controllers/apps";
import MatchmakingController from "./controllers/matchmaking";
import SessionController from "./controllers/session";
import UsersController from "./controllers/users";
import Router from "./router";
import { AppsControllerOptions } from "./types";

export default function mountApi() {
  const api = new Koa();

  const router = new Router({ prefix: "/api" });

  api
    .use(bodyParser({ json: true }))
    .use(cors({ keepHeadersOnError: false }))
    .use(
      router
        .inject<AppsControllerOptions>(AppsController, "apps", {
          registryPath: path.resolve(__dirname, "../registry.json")
        })
        .inject(UsersController, "users")
        .inject(SessionController, "session")
        .inject(MatchmakingController, "matchmaking")
        .routes()
    )
    // .use(logs())

  return api;
}
