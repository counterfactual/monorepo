import { decode as decodeToken } from "jsonwebtoken";
import { IRouterContext } from "koa-router";
import { Log } from "logepi";

import { userExists } from "../../db";
import {
  APIResource,
  APIResourceAttributes,
  AuthenticatedRequest,
  ErrorCode,
  UserAttributes,
  UserSession
} from "../../types";
import Controller from "../controller";

import decorateWith from "./decorator";

function authorizeMiddleware<
  T extends Controller<TAttributes>,
  TAttributes extends APIResourceAttributes
>(controller: T, originalFunction: Function) {
  return (...args) => {
    // Find the context argument.
    const ctx = args.find(arg => arg.request !== undefined) as IRouterContext;

    const authRequest = ctx.request as AuthenticatedRequest;
    const authHeader = authRequest.headers.authorization;
    if (!authHeader) {
      Log.info("Cancelling request, token is required", {
        tags: {
          resourceType: controller.resourceType,
          middleware: "authenticate"
        }
      });
      throw ErrorCode.TokenRequired;
    }
    if (!authHeader.startsWith("Bearer ")) {
      Log.info("Cancelling request, token is invalid", {
        tags: {
          resourceType: controller.resourceType,
          middleware: "authenticate"
        }
      });
      throw ErrorCode.InvalidToken;
    }
    const [, token] = authHeader.split(" ");
    const user = decodeToken(token) as APIResource<UserAttributes>;
    const isValidUser = userExists(user.attributes);
    if (!isValidUser) {
      Log.info("Cancelling request, token is invalid", {
        tags: {
          resourceType: controller.resourceType,
          middleware: "authenticate"
        }
      });
      throw ErrorCode.InvalidToken;
    }
    controller.user = { id: user.id, ...user.attributes } as UserSession;

    return originalFunction(...args);
  };
}

/**
 * This decorator is responsible of injecting the session to the controller
 * and authorizing an incoming request, whether it is for the entire controller
 * or for some specific methods.
 *
 * The built-in middleware will check for the "Authorization" header, which must be
 * set and start with `Bearer `. If there's no token or header, it'll throw the
 * `token_required` error. If the header is malformed, it'll throw the
 * `invalid_token` error.
 *
 * The token is decoded and converted to an `APIResource<UserAttributes>` object.
 * If the user exists in the database, the token is valid and the protected
 * request can continue execution. Otherwise, it'll throw the error code
 * `invalid_token`.
 */
export default function authorize() {
  return decorateWith(authorizeMiddleware);
}
