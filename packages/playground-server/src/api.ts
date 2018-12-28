import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";

const api = new Koa();

const router = new Router({ prefix: "/api" });

router.get("/hello", async (ctx, next) => {
  ctx.body = { hello: ctx.request.query.name };
  ctx.status = 200;
  return next();
});

api
  .use(router.routes())
  .use(bodyParser({ json: true }))
  .use(cors());

export default api;
