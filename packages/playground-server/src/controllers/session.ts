import { sign } from "jsonwebtoken";
import { Log } from "logepi";

import { getUser } from "../db";
import { APIResource, UserAttributes } from "../types";

import Controller from "./controller";

export default class SessionController extends Controller<UserAttributes> {
  async post(data?: APIResource<UserAttributes>) {
    const attributes = (data as APIResource<UserAttributes>).attributes;
    const user = await getUser(attributes.ethAddress);

    user.attributes.token = sign(user, process.env.NODE_PRIVATE_KEY as string, {
      expiresIn: "1Y"
    });

    return user;
  }
}
