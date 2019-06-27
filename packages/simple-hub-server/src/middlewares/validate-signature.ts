import { Application, JsonApiErrors } from "@ebryn/jsonapi-ts";
import escapeStringRegexp from "escape-string-regexp";
import { getAddress, verifyMessage } from "ethers/utils";
import { Context } from "koa";
import { Log } from "logepi";

import Errors from "../errors";
import { AuthenticatedRequest, JsonApiResource } from "../types";

/**
 * This middleware will inject a validation to check if a wallet signature
 * matches the message and the sender's address.
 *
 * If it succeeds, it'll will continue executing the route.
 *
 * If not, it'll throw an `invalid_signature` error. Also, if a controller
 * decorates a method and the request has no signature, it'll throw a
 * `signature_required` error.
 */
export default function(app: Application) {
  return validateSignature(app);
}

function validateSignature(app: Application) {
  const validatedEndpoints = {
    users: {
      POST: async (data: { [key: string]: any }) =>
        [
          "PLAYGROUND ACCOUNT REGISTRATION",
          `Username: ${data.attributes.username}`,
          `E-mail: ${data.attributes.email}`,
          `Ethereum address: ${data.attributes.ethAddress}`,
          `Node address: ${data.attributes.nodeAddress}`
        ].join("\n")
    },
    "session-requests": {
      POST: async (data: { [key: string]: any }) =>
        [
          "PLAYGROUND ACCOUNT LOGIN",
          `Ethereum address: ${data.attributes.ethAddress}`
        ].join("\n")
    }
  };

  return async (ctx: Context, next: () => Promise<any>) => {
    const { resource } = urlData(app, ctx);
    const expectedMessage =
      validatedEndpoints[resource] && validatedEndpoints[resource][ctx.method];

    if (expectedMessage) {
      try {
        return await validate(ctx, resource, expectedMessage).then(() =>
          next()
        );
      } catch (e) {
        const isJsonApiError = e && e.code;

        if (!isJsonApiError) console.error("ValidateSignature: ", e);

        const jsonApiError = isJsonApiError
          ? e
          : JsonApiErrors.UnhandledError();

        ctx.body = { errors: [jsonApiError] };
        ctx.status = jsonApiError.status;
      }
    } else {
      await next();
    }
  };
}

async function validate(
  ctx: Context,
  resourceName: string,
  expectedSignatureMessage: (data: JsonApiResource) => Promise<string>
) {
  const signedRequest = ctx.request as AuthenticatedRequest;
  const signedHeader = signedRequest.headers.authorization;
  const json = ctx.request["body"];
  const user: JsonApiResource = (json && json.data) || {};

  if (!signedHeader) {
    Log.info("Cancelling request, signature is required", {
      tags: {
        resourceName,
        middleware: "validateSignature"
      }
    });
    throw Errors.SignatureRequired();
  }

  if (!signedHeader.startsWith("Signature ")) {
    Log.info("Cancelling request, signature is invalid", {
      tags: {
        resourceName,
        middleware: "validateSignature"
      }
    });
    throw Errors.InvalidSignature();
  }

  const expectedMessage = await expectedSignatureMessage(user);
  const ethAddress = getAddress(String(user.attributes.ethAddress));
  const [, signedMessage] = signedHeader.split(" ");

  const expectedAddress = verifyMessage(
    expectedMessage as string,
    signedMessage
  );

  if (expectedAddress !== ethAddress) {
    Log.info("Cancelling request, signature is not valid", {
      tags: {
        resourceName,
        middleware: "validateSignature"
      }
    });
    throw Errors.InvalidSignature();
  }
}

function urlData(app: Application, ctx: Context) {
  const urlRegexp = new RegExp(
    `^\/?(?<namespace>${escapeStringRegexp(
      app.namespace || ""
    )})(\/?(?<resource>[\\w|-]+))?(\/(?<id>\\S+))?`
  );

  return (ctx.path.match(urlRegexp) || {})["groups"] || {};
}
