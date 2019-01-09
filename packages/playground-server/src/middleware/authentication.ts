import { decode } from "jsonwebtoken";

import { userExists } from "../db";
import { AuthenticatedContext, ErrorCode, PlaygroundUser } from "../types";

export default function authentication(...protectedRoutes: string[]) {
  return async (ctx: AuthenticatedContext, next: () => Promise<void>) => {
    if (!protectedRoutes.includes(ctx.path)) {
      return next();
    }

    const authHeader = ctx.headers["authorization"] as string;

    if (!authHeader) {
      throw ErrorCode.TokenRequired;
    }

    if (!authHeader.startsWith("Bearer ")) {
      throw ErrorCode.InvalidToken;
    }

    const [, token] = authHeader.split(" ");
    const user = decode(token) as PlaygroundUser;

    const isValidUser = await userExists(user);

    if (!isValidUser) {
      throw ErrorCode.InvalidToken;
    }

    ctx.user = user;

    return next();
  };
}
