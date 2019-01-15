import { sign } from "jsonwebtoken";
import { Log } from "logepi";

import { createUser } from "../db";
import { createMultisigFor } from "../node";
import { APIResource, UserAttributes } from "../types";

import Controller from "./controller";

export default class UsersController extends Controller<UserAttributes> {
  async post(data?: APIResource<UserAttributes>) {
    const userData = (data as APIResource<UserAttributes>).attributes;

    // Create the multisig and return its address.
    const multisig = await createMultisigFor(userData.ethAddress);

    Log.info("Multisig has been created", {
      tags: {
        multisigAddress: multisig.multisigAddress,
        endpoint: "createAccount"
      }
    });

    // Create the Playground User.
    const user = await createUser(userData);

    Log.info("User has been created", {
      tags: { userId: user.id, endpoint: "createAccount" }
    });

    // Update user with token.
    user.attributes.token = sign(user, process.env.NODE_PRIVATE_KEY as string, {
      expiresIn: "1Y"
    });

    Log.info("User token has been generated", {
      tags: { endpoint: "createAccount" }
    });

    return user;
  }
}
