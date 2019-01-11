import App, { Context } from "koa";
import { Log } from "logepi";

import {
  ApiResponse,
  ErrorCode,
  HttpStatusCode,
  StatusCodeMapping
} from "../types";

const statusCodes: StatusCodeMapping = new Map<
  ErrorCode | "default",
  HttpStatusCode
>([
  ["default", HttpStatusCode.BadRequest],
  [ErrorCode.InvalidSignature, HttpStatusCode.Forbidden],
  [ErrorCode.InvalidToken, HttpStatusCode.Forbidden],
  [ErrorCode.TokenRequired, HttpStatusCode.Unauthorized]
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

function processError(error: ErrorCode | Error, ctx: Context) {
  // Return 4xx for handled errors, 500 for unexpected throws.
  if (typeof error === "string") {
    const errorCode = error as ErrorCode;
    ctx.body = createErrorResponse(
      (statusCodes.get(errorCode) || statusCodes.get("default")) as number,
      errorCode
    );
    Log.debug("Emitting handled error", {
      tags: { error: JSON.stringify(ctx.body) }
    });
  } else {
    const errorObject = error as Error;
    ctx.body = createErrorResponse(
      HttpStatusCode.InternalServerError,
      ErrorCode.UnhandledError,
      {
        message: errorObject.message,
        name: errorObject.name,
        stack: errorObject.stack
      }
    );
    Log.debug("Emitting unhandled error", {
      tags: { error: JSON.stringify(ctx.body) }
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
