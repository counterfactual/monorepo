import { decode } from "jsonwebtoken";
import { Context } from "koa";

import { userExists } from "../db";
import { ErrorCode, PlaygroundUser } from "../types";

export default function authentication(...protectedRoutes: string[]) {
  return async (ctx: Context, next: () => Promise<void>) => {
    if (!protectedRoutes.includes(ctx.path)) {
      return next();
    }

    if (!ctx.headers["Authorization"]) {
      throw ErrorCode.TokenRequired;
    }

    const token = ctx.headers["Authorization"] as string;
    const user = decode(token) as PlaygroundUser;
    const isValidUser = await userExists(user);

    if (!isValidUser) {
      throw ErrorCode.InvalidToken;
    }

    return next();
  };
}
