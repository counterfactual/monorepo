import { decode } from "jsonwebtoken";
import { RouterContext } from "koa-router";

import { userExists } from "../db";
import { User } from "../resources";
import { AuthenticatedRequest } from "../types";

export default function authenticate(): any {
  return async (ctx: RouterContext, next: () => Promise<void>) => {
    const authRequest = ctx.request as AuthenticatedRequest;
    const authHeader = authRequest.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const [, token] = authHeader.split(" ");
    const user = decode(token) as User;
    const isValidUser = userExists(user);

    if (isValidUser) {
      ctx.user = {
        id: user.id,
        attributes: user.attributes,
        type: user.type,
        relationships: user.relationships
      } as User;
    }

    return next();
  };
}
