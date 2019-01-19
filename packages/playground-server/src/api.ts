import { ResourceRegistry } from "@ebryn/jsonapi-ts";
import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import { KoaLoggingMiddleware as logs } from "logepi";

// API Controllers
import authenticate from "./middlewares/authenticate";
import AppProcessor from "./resources/app/processor";
import MatchmakingRequestProcessor from "./resources/matchmaking-request/processor";
import SessionRequestProcessor from "./resources/session-request/processor";
import UserProcessor from "./resources/user/processor";

export default function mountApi() {
  const api = new Koa();

  const router = new Router({ prefix: "/api" });
  const processors = new ResourceRegistry(router);

  api
    .use(bodyParser({ json: true }))
    .use(cors({ keepHeadersOnError: false }))
    .use(authenticate())
    .use(
      processors
        .register("app", AppProcessor)
        .register("matchmakingRequest", MatchmakingRequestProcessor)
        .register("sessionRequest", SessionRequestProcessor)
        .register("user", UserProcessor)
        .getEndpoints()
    )
    .use(logs());

  return api;
}
