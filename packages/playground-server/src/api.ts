import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import serverless from "serverless-http";

import { firebaseConfiguration, token } from "./methods";
import { expiredTokenControl, injectToken, jsonWebToken } from "./middlewares";

const jwtSecret = process.env.PLAYGROUND_SERVER_SECRET as string;

const app = new Koa();
const router = new Router();

if (process.env.PLAYGROUND_SERVER_ENV !== "development") {
  router.prefix("/.netlify/functions/api");
} else {
  router.prefix("/api");
}

router.get("/firebase", firebaseConfiguration());
router.get("/token", token());

app
  .use(expiredTokenControl())
  .use(jsonWebToken(jwtSecret))
  .use(cors())
  .use(router.routes())
  .use(
    injectToken(jwtSecret).unless({
      path: [/firebase$/]
    })
  )
  .use(bodyParser({ json: true }));

const handler = serverless(app);

export { handler, app };
