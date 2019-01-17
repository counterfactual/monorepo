import { sign } from "jsonwebtoken";
import { Log } from "logepi";

import { createUser } from "../db";
import { createMultisigFor } from "../node";
import {
  APIResource,
  ControllerMethod,
  UserAttributes,
  UserSession
} from "../types";

import Controller from "./controller";
import Authorize from "./decorators/authorize";
import ValidateSignature from "./decorators/validate-signature";

export default class UsersController extends Controller<UserAttributes> {
  @Authorize()
  async getAll() {
    const user = this.user as UserSession;
    return [
      {
        type: "users",
        id: user.id,
        attributes: {
          username: user.username,
          email: user.email,
          ethAddress: user.ethAddress,
          nodeAddress: user.nodeAddress,
          multisigAddress: user.multisigAddress
        }
      } as APIResource<UserAttributes>
    ];
  }

  @ValidateSignature({
    expectedMessage: async (resource: APIResource<UserAttributes>) =>
      [
        "PLAYGROUND ACCOUNT REGISTRATION",
        `Username: ${resource.attributes.username}`,
        `E-mail: ${resource.attributes.email}`,
        `Ethereum address: ${resource.attributes.ethAddress}`
      ].join("\n")
  })
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

    // Update user with multisig.
    user.attributes.multisigAddress = multisig.multisigAddress;

    Log.info("User token has been generated", {
      tags: { endpoint: "createAccount" }
    });

    return user;
  }

  async expectedSignatureMessageFor(
    method: ControllerMethod,
    resource: APIResource<UserAttributes>
  ): Promise<string | undefined> {
    if (method === ControllerMethod.Post) {
      return;
    }

    return;
  }

  protectedMethods() {
    return [ControllerMethod.GetAll];
  }
}
