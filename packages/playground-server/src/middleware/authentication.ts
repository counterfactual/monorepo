import { decode } from "jsonwebtoken";
import { Log } from "logepi";

import { userExists } from "../db";
import { AuthenticatedContext, ErrorCode, PlaygroundUser } from "../types";

export default function authentication(...protectedRoutes: string[]) {
  return async (ctx: AuthenticatedContext, next: () => Promise<void>) => {
    if (!protectedRoutes.includes(ctx.path)) {
      Log.debug("Skipping route - it's public", {
        tags: { endpoint: ctx.path, middleware: "authentication" }
      });
      return next();
    }

    const authHeader = ctx.headers["authorization"] as string;

    if (!authHeader) {
      Log.info("Token not found, leaving", {
        tags: { endpoint: ctx.path, middleware: "authentication" }
      });
      throw ErrorCode.TokenRequired;
    }

    if (!authHeader.startsWith("Bearer ")) {
      Log.info("Token is not valid, leaving", {
        tags: { endpoint: ctx.path, middleware: "authentication" }
      });
      throw ErrorCode.InvalidToken;
    }

    const [, token] = authHeader.split(" ");
    const user = decode(token) as PlaygroundUser;

    Log.info("Decoded token, checking if it belongs to a valid user", {
      tags: {
        allegedUserId: user.id,
        endpoint: ctx.path,
        middleware: "authentication"
      }
    });

    const isValidUser = await userExists(user);

    if (!isValidUser) {
      Log.info("User is not real, leaving", {
        tags: { endpoint: ctx.path, middleware: "authentication" }
      });
      throw ErrorCode.InvalidToken;
    }

    ctx.user = user;

    Log.info("User is valid, stored in context", {
      tags: {
        endpoint: ctx.path,
        middleware: "authentication",
        userId: user.id
      }
    });

    return next();
  };
}
