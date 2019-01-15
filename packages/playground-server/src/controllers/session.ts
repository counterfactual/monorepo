import { sign } from "jsonwebtoken";

import { getUser } from "../db";
import { APIResource, ControllerMethod, SessionAttributes } from "../types";

import Controller from "./controller";

export default class SessionController extends Controller<SessionAttributes> {
  async post(data?: APIResource<SessionAttributes>) {
    const attributes = (data as APIResource<SessionAttributes>).attributes;
    const user = await getUser(attributes.ethAddress);

    user.attributes.token = sign(user, process.env.NODE_PRIVATE_KEY as string, {
      expiresIn: "1Y"
    });

    return user;
  }

  async expectedSignatureMessageFor(
    method: ControllerMethod,
    resource: APIResource<SessionAttributes>
  ): Promise<string | undefined> {
    if (method === ControllerMethod.Post) {
      return [
        "PLAYGROUND ACCOUNT LOGIN",
        `Ethereum address: ${resource.attributes.ethAddress}`
      ].join("\n");
    }

    return;
  }
}
