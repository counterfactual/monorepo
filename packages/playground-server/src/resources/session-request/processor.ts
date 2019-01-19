import { OperationProcessor } from "@ebryn/jsonapi-ts";
import { sign } from "jsonwebtoken";

import { User } from "..";
import { getUser } from "../../db";
import ValidateSignature from "../../decorators/validate-signature";

import SessionRequest from "./resource";

export default class SessionRequestProcessor extends OperationProcessor<
  SessionRequest
> {
  @ValidateSignature({
    expectedMessage: async (resource: SessionRequest) =>
      [
        "PLAYGROUND ACCOUNT LOGIN",
        `Ethereum address: ${resource.attributes.ethAddress}`
      ].join("\n")
  })
  async add(data: SessionRequest) {
    const user = await getUser(data as User);

    user.attributes.token = sign(user, process.env.NODE_PRIVATE_KEY as string, {
      expiresIn: "1Y"
    });

    return { data: user };
  }
}
