import { Authorize, Operation, OperationProcessor } from "@ebryn/jsonapi-ts";
import { sign } from "jsonwebtoken";
import { Log } from "logepi";

import { createUser } from "../../db";
import ValidateSignature from "../../decorators/validate-signature";
import { createMultisigFor } from "../../node";

import User from "./resource";

export default class UserProcessor extends OperationProcessor {
  public resourceClass = User;

  @Authorize()
  protected async get(op: Operation): Promise<User[]> {
    const user = this.app.user as User;
    return [user].filter(Boolean);
  }

  @ValidateSignature({
    expectedMessage: async (resource: User) =>
      [
        "PLAYGROUND ACCOUNT REGISTRATION",
        `Username: ${resource.attributes.username}`,
        `E-mail: ${resource.attributes.email}`,
        `Ethereum address: ${resource.attributes.ethAddress}`,
        `Node address: ${resource.attributes.nodeAddress}`
      ].join("\n")
  })
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
      newUser,
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
