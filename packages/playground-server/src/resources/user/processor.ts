import { Operation, OperationProcessor } from "@ebryn/jsonapi-ts";
import { sign } from "jsonwebtoken";
import { Log } from "logepi";

import { createUser, getUsers } from "../../db";
import { createMultisigFor } from "../../node";

import User from "./resource";

export default class UserProcessor extends OperationProcessor {
  public resourceClass = User;

  protected async get(op: Operation): Promise<User[]> {
    if (op.ref.id === "me") {
      if (this.app.user) {
        op.ref.id = this.app.user.id;
      } else {
        return [];
      }
    }

    return getUsers({ id: op.ref.id });
  }

  async add(op: Operation): Promise<User> {
    // Create the multisig and return its address.
    const user = op.data;
    const { nodeAddress } = user.attributes;

    const multisig = await createMultisigFor(String(nodeAddress));

    Log.info("Multisig has been created", {
      tags: {
        multisigAddress: multisig.multisigAddress,
        endpoint: "createAccount"
      }
    });

    user.attributes.multisigAddress = multisig.multisigAddress;

    // Create the Playground User.
    const newUser = await createUser(user);

    Log.info("User has been created", {
      tags: { userId: user.id, endpoint: "createAccount" }
    });

    // Update user with token.
    newUser.attributes.token = sign(
      JSON.parse(JSON.stringify(newUser)),
      process.env.NODE_PRIVATE_KEY as string,
      {
        expiresIn: "1Y"
      }
    );

    Log.info("User token has been generated", {
      tags: { endpoint: "createAccount" }
    });

    return newUser;
  }
}
