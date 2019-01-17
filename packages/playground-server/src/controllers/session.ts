import { sign } from "jsonwebtoken";

import { getUser } from "../db";
import { APIResource, SessionAttributes } from "../types";

import Controller from "./controller";
import ValidateSignature from "./decorators/validate-signature";

export default class SessionController extends Controller<SessionAttributes> {
  @ValidateSignature({
    expectedMessage: async (resource: APIResource<SessionAttributes>) =>
      [
        "PLAYGROUND ACCOUNT LOGIN",
        `Ethereum address: ${resource.attributes.ethAddress}`
      ].join("\n")
  })
  async post(data?: APIResource<SessionAttributes>) {
    const attributes = (data as APIResource<SessionAttributes>).attributes;
    const user = await getUser(attributes.ethAddress);

    user.attributes.token = sign(user, process.env.NODE_PRIVATE_KEY as string, {
      expiresIn: "1Y"
    });

    return user;
  }
}
