import { Operation, OperationProcessor } from "@ebryn/jsonapi-ts";
import { sign } from "jsonwebtoken";

import { getUser } from "../../db";
import User from "../user/resource";

import SessionRequest from "./resource";

export default class SessionRequestProcessor extends OperationProcessor<
  SessionRequest
> {
  public resourceClass = SessionRequest;

  protected async add(op: Operation): Promise<User> {
    const user = await getUser(op.data);

    user.attributes.token = sign(
      JSON.parse(JSON.stringify(user)),
      process.env.NODE_PRIVATE_KEY as string,
      {
        expiresIn: "1Y"
      }
    );

    return user;
  }
}
