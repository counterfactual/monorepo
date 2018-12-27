import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";
import serverless from "serverless-http";

const app = new Koa();

const router = new Router();

if (process.env.PLAYGROUND_SERVER_ENV !== "development") {
  router.prefix("/.netlify/functions/api");
} else {
  router.prefix("/api");
}

router.get("/hello", async (ctx, next) => {
  ctx.body = { hello: ctx.request.query.name };
  ctx.status = 200;
  return next();
});

app
  .use(router.routes())
  .use(bodyParser({ json: true }))
  .use(cors());

const handler = serverless(app);

export { handler, app };
