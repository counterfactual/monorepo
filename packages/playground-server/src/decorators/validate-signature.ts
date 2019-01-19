import {
  decorateWith,
  JsonApiRequest,
  OperationProcessor,
  Resource
} from "@ebryn/jsonapi-ts";
import { getAddress, verifyMessage } from "ethers/utils";
import { IRouterContext } from "koa-router";
import { Log } from "logepi";

import { User } from "../resources";
import { AuthenticatedRequest, ErrorCode } from "../types";

function validateSignatureMiddleware(
  operationProcessor: OperationProcessor,
  operation: Function,
  expectedSignatureMessage: (resource: Resource) => Promise<string>
) {
  return async (...args) => {
    const ctx = args.find(arg => "request" in arg) as IRouterContext;
    const signedRequest = ctx.request as AuthenticatedRequest;
    const signedHeader = signedRequest.headers.authorization;
    const json = ctx.request.body as JsonApiRequest;
    const user = json.data as User;

    if (!signedHeader) {
      Log.info("Cancelling request, signature is required", {
        tags: {
          resourceType: operationProcessor.resourceName,
          middleware: "validateSignature"
        }
      });
      throw ErrorCode.SignatureRequired;
    }

    if (!signedHeader.startsWith("Signature ")) {
      Log.info("Cancelling request, signature is invalid", {
        tags: {
          resourceType: operationProcessor.resourceName,
          middleware: "validateSignature"
        }
      });
      throw ErrorCode.InvalidSignature;
    }

    const expectedMessage = await expectedSignatureMessage(user);
    const ethAddress = getAddress(user.attributes.ethAddress);
    const [, signedMessage] = signedHeader.split(" ");

    const expectedAddress = verifyMessage(
      expectedMessage as string,
      signedMessage
    );

    if (expectedAddress !== ethAddress) {
      Log.info("Cancelling request, signature is not valid", {
        tags: {
          resourceType: operationProcessor.resourceName,
          middleware: "validateSignature"
        }
      });
      throw ErrorCode.InvalidSignature;
    }

    return operation.call(operationProcessor, ...args);
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
export default function validateSignature<T extends Resource = {} & Resource>({
  expectedMessage
}: {
  expectedMessage: (resource: T) => Promise<string>;
}) {
  return decorateWith(validateSignatureMiddleware, expectedMessage);
}
