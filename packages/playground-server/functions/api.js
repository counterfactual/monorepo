"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serverless_http_1 = __importDefault(require("serverless-http"));
const cors_1 = __importDefault(require("@koa/cors"));
const koa_1 = __importDefault(require("koa"));
const koa_body_1 = __importDefault(require("koa-body"));
const koa_router_1 = __importDefault(require("koa-router"));
const app = new koa_1.default();
const router = new koa_router_1.default();
router.get("/hello", async (ctx, next) => {
    ctx.body = { hello: ctx.request.query.name };
    ctx.status = 200;
    return next();
});
app
    .use(router.routes())
    .use(koa_body_1.default({ json: true }))
    .use(cors_1.default());
if (!process.env.AWS_LAMBDA_JS_RUNTIME) {
    app.listen(3132, () => {
        console.log("Listening in localhost:3132");
    });
}
exports.default = serverless_http_1.default(app);
//# sourceMappingURL=api.js.map