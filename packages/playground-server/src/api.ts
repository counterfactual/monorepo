import { Application, jsonApiKoa } from "@ebryn/jsonapi-ts";
import cors from "@koa/cors";
import Koa from "koa";
import { KoaLoggingMiddleware as logs } from "logepi";

import validateSignature from "./middlewares/validate-signature";
import AppProcessor from "./resources/app/processor";
import AppResource from "./resources/app/resource";
import MatchmakingRequestProcessor from "./resources/matchmaking-request/processor";
import MatchmakingRequestResource from "./resources/matchmaking-request/resource";
import SessionRequestProcessor from "./resources/session-request/processor";
import SessionRequestResource from "./resources/session-request/resource";
import UserProcessor from "./resources/user/processor";
import UserResource, {
  MatchedUser as MatchedUserResource
} from "./resources/user/resource";

export default function mountApi() {
  const app = new Application({
    namespace: "api",
    types: [
      AppResource,
      MatchmakingRequestResource,
      SessionRequestResource,
      UserResource,
      MatchedUserResource
    ],
    processors: [
      new AppProcessor(),
      new MatchmakingRequestProcessor(),
      new SessionRequestProcessor(),
      new UserProcessor()
    ]
  });

  const api = new Koa();

  api
    .use(cors({ keepHeadersOnError: false }))
    .use(jsonApiKoa(app, validateSignature(app)))
    .use(logs());

  return api;
}
