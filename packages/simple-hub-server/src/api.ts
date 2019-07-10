import { Application, jsonApiKoa } from "@ebryn/jsonapi-ts";
import cors from "@koa/cors";
import Koa from "koa";
import { KoaLoggingMiddleware as logs } from "logepi";

import assertIsValidSignature from "./middlewares/validate-signature";
import AppProcessor from "./resources/app/processor";
import AppResource from "./resources/app/resource";
import HeartbeatProcessor from "./resources/heartbeat/processor";
import Heartbeat from "./resources/heartbeat/resource";
import MatchmakingRequestProcessor from "./resources/matchmaking-request/processor";
import MatchmakingRequestResource from "./resources/matchmaking-request/resource";
import MultisigDeployProcessor from "./resources/multisig-deploy/processor";
import MultisigDeployResource from "./resources/multisig-deploy/resource";
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
      Heartbeat,
      MatchmakingRequestResource,
      MatchedUserResource,
      MultisigDeployResource,
      SessionRequestResource,
      UserResource
    ],
    processors: [
      new AppProcessor(),
      new HeartbeatProcessor(),
      new MatchmakingRequestProcessor(),
      new MultisigDeployProcessor(),
      new SessionRequestProcessor(),
      new UserProcessor()
    ]
  });

  const api = new Koa();

  // @joel: Move this to logepi.
  const isUrlExcluded = (url: string, excludeList: string[]) =>
    excludeList.some(endpoint => url.endsWith(endpoint));

  const conditionalLogs = ({ exclude }) => (ctx, next) =>
    isUrlExcluded(ctx.req.url as string, exclude) ? next() : logs()(ctx, next);

  api
    .use(cors({ keepHeadersOnError: false }))
    .use(jsonApiKoa(app, assertIsValidSignature(app)))
    .use(
      conditionalLogs({
        exclude: ["/heartbeats", "/apps"]
      })
    );

  return api;
}
