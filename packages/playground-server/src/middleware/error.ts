import App, { Context } from "koa";

import { ApiResponse, ErrorCode, StatusCodeMapping } from "../types";

const statusCodes: StatusCodeMapping = new Map<ErrorCode | "default", number>([
  ["default", 400],
  [ErrorCode.InvalidSignature, 403]
]);

function createErrorResponse(
  status: number,
  errorCode: ErrorCode,
  context?: Error
): ApiResponse {
  return {
    ok: false,
    error: { status, errorCode, context }
  };
}

function processError(error, ctx) {
  // Return 4xx for handled errors, 500 for unexpected throws.
  if (typeof error === "string") {
    const errorCode = error as ErrorCode;
    ctx.body = createErrorResponse(
      (statusCodes.get(errorCode) || statusCodes.get("default")) as number,
      errorCode
    );
  } else {
    const errorObject = error as Error;
    ctx.body = createErrorResponse(500, ErrorCode.UnhandledError, {
      ...errorObject
    });
  }

  ctx.status = ctx.body.error.status;
}

export default function errorHandler(app: App) {
  app.on("error", processError);

  return async (ctx: Context, next: () => Promise<void>) => {
    try {
      await next();
    } catch (error) {
      ctx.app.emit("error", error, ctx);
    }
  };
}
