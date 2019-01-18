import { getAddress, verifyMessage } from "ethers/utils";
import { IRouterContext } from "koa-router";
import { Log } from "logepi";

import {
  APIRequest,
  APIResource,
  AuthenticatedRequest,
  ErrorCode,
  SessionAttributes
} from "../../types";
import Controller from "../controller";

import decorateWith from "./decorator";

function validateSignatureMiddleware(
  controller: Controller<any>,
  originalFunction: Function,
  expectedSignatureMessage: (resource: APIResource<any>) => Promise<string>
) {
  return async (...args) => {
    const ctx = args.find(arg => "request" in arg) as IRouterContext;
    const signedRequest = ctx.request as AuthenticatedRequest;
    const signedHeader = signedRequest.headers.authorization;
    const json = ctx.request.body as APIRequest;
    const resource = json.data as APIResource;

    if (!signedHeader) {
      Log.info("Cancelling request, signature is required", {
        tags: {
          resourceType: controller.resourceType,
          middleware: "validateSignature"
        }
      });
      throw ErrorCode.SignatureRequired;
    }

    if (!signedHeader.startsWith("Signature ")) {
      Log.info("Cancelling request, signature is invalid", {
        tags: {
          resourceType: controller.resourceType,
          middleware: "validateSignature"
        }
      });
      throw ErrorCode.InvalidSignature;
    }

    const expectedMessage = await expectedSignatureMessage(resource);
    const ethAddress = getAddress(
      (((json as unknown) as APIRequest<SessionAttributes>).data as APIResource<
        SessionAttributes
      >).attributes.ethAddress
    );
    const [, signedMessage] = signedHeader.split(" ");

    const expectedAddress = verifyMessage(
      expectedMessage as string,
      signedMessage
    );

    if (expectedAddress !== ethAddress) {
      Log.info("Cancelling request, signature is not valid", {
        tags: {
          resourceType: controller.resourceType,
          middleware: "validateSignature"
        }
      });
      throw ErrorCode.InvalidSignature;
    }

    return originalFunction.call(controller, ...args);
  };
}

/**
 * This decorator will inject a validation to check if a wallet signature
 * matches the message and the sender's address.
 *
 * If it succeeds, it'll will continue executing the route.
 *
 * If not, it'll throw an `invalid_signature` error. Also, if a controller
 * decorates a method and the request has no signature, it'll throw a
 * `signature_required` error.
 */
export default function validateSignature({
  expectedMessage
}: {
  expectedMessage: (resource: APIResource<any>) => Promise<string>;
}) {
  return decorateWith(validateSignatureMiddleware, expectedMessage);
}
