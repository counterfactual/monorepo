import serverless from "serverless-http";

import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";

const app = new Koa();
const router = new Router();

router.get("/hello", async (ctx, next) => {
  ctx.body = { hello: ctx.request.query.name };
  ctx.status = 200;
  return next();
});

app
  .use(router.routes())
  .use(bodyParser({ json: true }))
  .use(cors());

if (!process.env.AWS_LAMBDA_JS_RUNTIME) {
  // If running in local context, start the API.
  app.listen(3132, () => {
    console.log("Listening in localhost:3132");
  });
}

export default serverless(app);
