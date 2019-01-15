import { v4 as generateUUID } from "uuid";

import { matchmakeUser } from "../db";
import { getNodeAddress } from "../node";
import { APIResource, MatchmakingAttributes, UserSession } from "../types";

import Controller from "./controller";

export default class MatchmakingController extends Controller<
  MatchmakingAttributes
> {
  async post() {
    const user = this.user as UserSession;
    const matchedUser = await matchmakeUser(user.ethAddress);

    return {
      type: "matchmaking",
      id: generateUUID(),
      attributes: {
        intermediary: getNodeAddress()
      },
      relationships: {
        users: {
          data: {
            type: "users",
            id: user.ethAddress
          }
        },
        matchedUser: {
          data: {
            type: "matchedUser",
            id: matchedUser.ethAddress
          }
        }
      }
    } as APIResource<MatchmakingAttributes>;
  }
}
