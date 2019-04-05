import { Authorize, Operation, OperationProcessor } from "@ebryn/jsonapi-ts";
import { sign } from "jsonwebtoken";
import { Log } from "logepi";

import {
  createUser,
  deleteAccount,
  ethAddressAlreadyRegistered,
  getUsers,
  updateUser,
  usernameAlreadyRegistered
} from "../../db";
import errors from "../../errors";
import informSlack from "../../utils";

import User from "./resource";

export default class UserProcessor extends OperationProcessor<User> {
  public resourceClass = User;

  public async identify(op: Operation): Promise<User[]> {
    return getUsers({ id: op.ref.id });
  }

  @Authorize()
  public async get(op: Operation): Promise<any> {
    const isRequestingSelfData =
      op.ref.id === "me" || (this.app.user && this.app.user.id === op.ref.id);

    if (isRequestingSelfData) {
      return this.identify({ ...op, ref: { ...op.ref, id: this.app.user.id } });
    }

    return getUsers(op.ref.id ? { id: op.ref.id } : op.params.filter || {}, [
      "username",
      "ethAddress",
      "nodeAddress",
      "multisigAddress"
    ]);
  }

  public async add(op: Operation): Promise<User> {
    const user = op.data as User;

    const { username, /* email, */ ethAddress } = user.attributes;

    if (!username) {
      throw errors.UsernameRequired();
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
      tags: { username, userId: user.id, endpoint: "createAccount" }
    });

    informSlack(
      `👩‍💻 *USER_CREATED* (_${username}_) | User created an account on the Playground.`
    );

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

  public async remove(op: Operation): Promise<void> {
    const userId = op.ref.id as string;
    await deleteAccount(userId);
  }
}
