import { Operation, OperationProcessor } from "@ebryn/jsonapi-ts";
import { sign } from "jsonwebtoken";
import { Log } from "logepi";

import {
  bindTransactionHashToUser,
  createUser,
  ethAddressAlreadyRegistered,
  getUsers,
  updateUser,
  usernameAlreadyRegistered
} from "../../db";
import errors from "../../errors";
import NodeWrapper from "../../node";

import User from "./resource";

export default class UserProcessor extends OperationProcessor<User> {
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
      !isMe ? ["username", "ethAddress", "nodeAddress", "multisigAddress"] : []
    );
  }

  public async add(op: Operation): Promise<User> {
    // Create the multisig and return its address.
    const user = op.data as User;

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

    const { transactionHash } = await NodeWrapper.createStateChannelFor(
      nodeAddress
    );

    user.attributes.transactionHash = transactionHash;

    // Create the Playground User.
    const newUser = await createUser(user);

    Log.info("User has been created", {
      tags: { userId: user.id, endpoint: "createAccount" }
    });

    await bindTransactionHashToUser(newUser, transactionHash);

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

  public async update(op: Operation): Promise<User> {
    const user = op.data as User;

    const { email } = user.attributes;

    if (!email) {
      throw errors.EmailRequired();
    }

    const updatedUser = await updateUser(user);

    updatedUser.attributes.token = sign(
      JSON.parse(JSON.stringify(updatedUser)),
      process.env.NODE_PRIVATE_KEY as string,
      {
        expiresIn: "1Y"
      }
    );

    Log.info("User token has been updated", {
      tags: { endpoint: "update" }
    });

    return updatedUser;
  }
}
