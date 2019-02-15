import { Node } from "@counterfactual/types";
import { Operation, OperationProcessor } from "@ebryn/jsonapi-ts";
import { sign } from "jsonwebtoken";
import { Log } from "logepi";

import {
  bindMultisigToUser,
  createUser,
  ethAddressAlreadyRegistered,
  getUsers,
  usernameAlreadyRegistered
} from "../../db";
import errors from "../../errors";
import NodeWrapper from "../../node";

import User from "./resource";

export default class UserProcessor extends OperationProcessor {
  public resourceClass = User;

  public async get(op: Operation): Promise<User[]> {
    const isMe =
      op.ref.id === "me" || (this.app.user && this.app.user.id === op.ref.id);

    if (op.ref.id === "me") {
      if (this.app.user) {
        op.ref.id = this.app.user.id;
      } else {
        return [];
      }
    }

    return getUsers(
      op.ref.id ? { id: op.ref.id } : op.params.filter || {},
      !isMe ? ["username", "ethAddress", "nodeAddress"] : []
    );
  }

  public async add(op: Operation): Promise<User> {
    // Create the multisig and return its address.
    const user = op.data;

    const { username, email, ethAddress, nodeAddress } = user.attributes;

    if (!username) {
      throw errors.UsernameRequired();
    }

    if (!email) {
      throw errors.EmailRequired();
    }

    if (!ethAddress) {
      throw errors.UserAddressRequired();
    }

    if (await usernameAlreadyRegistered(username as string)) {
      throw errors.UsernameAlreadyExists();
    }

    if (await ethAddressAlreadyRegistered(ethAddress as string)) {
      throw errors.AddressAlreadyRegistered();
    }

    // Create the Playground User.
    const newUser = await createUser(user);

    Log.info("User has been created", {
      tags: { userId: user.id, endpoint: "createAccount" }
    });

    NodeWrapper.createStateChannelFor(nodeAddress as string).then(
      async (result: Node.CreateChannelResult) => {
        await bindMultisigToUser(newUser, result.multisigAddress);
      }
    );

    Log.info("Multisig has been requested", {
      tags: {
        endpoint: "createAccount"
      }
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
