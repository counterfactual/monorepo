import { v4 as generateUUID } from "uuid";

import { matchmakeUser } from "../db";
import { getNodeAddress } from "../node";
import {
  APIResource,
  APIResponse,
  MatchmakingAttributes,
  UserSession
} from "../types";

import Controller from "./controller";
import Authorize from "./decorators/authorize";

@Authorize()
export default class MatchmakingController extends Controller<
  MatchmakingAttributes
> {
  async post() {
    const user = this.user as UserSession;
    const matchedUser = await matchmakeUser(user.ethAddress);

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
            ethAddress: user.ethAddress
          }
        },
        {
          type: "matchedUser",
          id: matchedUser.id,
          attributes: {
            username: matchedUser.username,
            ethAddress: matchedUser.ethAddress
          }
        }
      ]
    } as APIResponse<MatchmakingAttributes>;
  }
}
