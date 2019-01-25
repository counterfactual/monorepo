import { Operation, OperationProcessor } from "@ebryn/jsonapi-ts";
import { sign } from "jsonwebtoken";

import { getUser } from "../../db";
import ValidateSignature from "../../decorators/validate-signature";
import User from "../user/resource";

import SessionRequest from "./resource";

export default class SessionRequestProcessor extends OperationProcessor<
  SessionRequest
> {
  public resourceClass = SessionRequest;

  @ValidateSignature({
    expectedMessage: async (resource: SessionRequest) =>
      [
        "PLAYGROUND ACCOUNT LOGIN",
        `Ethereum address: ${resource.attributes.ethAddress}`
      ].join("\n")
  })
  protected async add(op: Operation): Promise<User> {
    const user = await getUser(op.data);

    user.attributes.token = sign(user, process.env.NODE_PRIVATE_KEY as string, {
      expiresIn: "1Y"
    });

    return user;
  }
}
