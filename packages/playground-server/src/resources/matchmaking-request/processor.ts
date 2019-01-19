import {
  AuthenticatedContext,
  JsonApiDocument,
  OperationProcessor
} from "@ebryn/jsonapi-ts";
import { v4 as generateUUID } from "uuid";

import { User } from "..";
import { matchmakeUser } from "../../db";
import { getNodeAddress } from "../../node";

import MatchmakingRequest from "./resource";

export default class MatchmakingRequestProcessor extends OperationProcessor<
  MatchmakingRequest
> {
  async add(data: MatchmakingRequest, ctx: AuthenticatedContext) {
    const user = ctx.user as User;
    const matchedUser = await matchmakeUser(user);

    return {
      data: {
        type: "matchmakingRequest",
        id: generateUUID(),
        attributes: {
          intermediary: getNodeAddress()
        },
        relationships: {
          user: {
            data: {
              type: "user",
              id: user.id
            }
          },
          matchedUser: {
            data: {
              type: "matchedUser",
              id: matchedUser.id
            }
          }
        }
      },
      included: [
        {
          type: "user",
          id: user.id,
          attributes: {
            username: user.attributes.username,
            ethAddress: user.attributes.ethAddress,
            nodeAddress: user.attributes.nodeAddress
          }
        },
        matchedUser
      ]
    } as JsonApiDocument<MatchmakingRequest>;
  }
}
