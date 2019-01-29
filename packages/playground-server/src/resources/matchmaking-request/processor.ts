import {
  Authorize,
  Operation,
  OperationProcessor,
  ResourceRelationship
} from "@ebryn/jsonapi-ts";
import { v4 as generateUUID } from "uuid";

import { matchmakeUser } from "../../db";
import { getNodeAddress } from "../../node";
import User from "../user/resource";

import MatchmakingRequest from "./resource";

export default class MatchmakingRequestProcessor extends OperationProcessor<
  MatchmakingRequest
> {
  public resourceClass = MatchmakingRequest;

  @Authorize()
  protected async add(op: Operation): Promise<MatchmakingRequest> {
    const user = this.app.user as User;
    const matchedUser = await matchmakeUser(user);

    return new MatchmakingRequest({
      id: generateUUID(),
      attributes: {
        intermediary: getNodeAddress()
      },
      relationships: {
        user: {
          data: {
            type: "user",
            id: user.id
          } as ResourceRelationship
        },
        matchedUser: {
          data: {
            type: "matchedUser",
            id: matchedUser.id
          } as ResourceRelationship
        }
      }
    });

    // return {
    //   included: [
    //     {
    //       type: "user",
    //       id: user.id,
    //       attributes: {
    //         username: user.attributes.username,
    //         ethAddress: user.attributes.ethAddress,
    //         nodeAddress: user.attributes.nodeAddress
    //       }
    //     },
    //     matchedUser
    //   ]
    // } as JsonApiDocument<MatchmakingRequest>;
  }
}
