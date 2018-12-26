import cors from "@koa/cors";
import Koa from "koa";
import bodyParser from "koa-body";
import Router from "koa-router";

const app = new Koa();
const router = new Router();

app
  .use(router.routes())
  .use(bodyParser({ json: true }))
  .use(cors());

app.listen(3132);
