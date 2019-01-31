import { v4 as generateUUID } from "uuid";

import { getUserByName, matchmakeUser } from "../db";
import { getNodeAddress } from "../node";
import {
  APIResource,
  APIResponse,
  MatchedUserAttributes,
  MatchmakingAttributes,
  UserSession
} from "../types";

import Controller from "./controller";
import Authorize from "./decorators/authorize";

@Authorize()
export default class MatchmakingController extends Controller<
  MatchmakingAttributes
> {
  async post(data?: APIResource<MatchmakingAttributes>) {
    const user = this.user as UserSession;
    let matchedUser: MatchedUserAttributes;

    if (data && data.attributes) {
      const matchedUserResource = await getUserByName(data.attributes
        .matchmakeWith as string);
      matchedUser = {
        id: matchedUserResource.id as string,
        ethAddress: matchedUserResource.attributes.ethAddress as string,
        nodeAddress: matchedUserResource.attributes.nodeAddress,
        username: matchedUserResource.attributes.username
      };
    } else {
      matchedUser = await matchmakeUser(user.ethAddress);
    }

    return {
      data: {
        type: "matchmaking",
        id: generateUUID(),
        attributes: {
          intermediary: getNodeAddress()
        },
        relationships: {
          users: {
            data: {
              type: "users",
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
      } as APIResource<MatchmakingAttributes>,
      included: [
        {
          type: "users",
          id: user.id,
          attributes: {
            username: user.username,
            ethAddress: user.ethAddress,
            nodeAddress: user.nodeAddress
          }
        },
        {
          type: "matchedUser",
          id: matchedUser.id,
          attributes: {
            username: matchedUser.username,
            ethAddress: matchedUser.ethAddress,
            nodeAddress: matchedUser.nodeAddress
          }
        }
      ]
    } as APIResponse<MatchmakingAttributes>;
  }
}
