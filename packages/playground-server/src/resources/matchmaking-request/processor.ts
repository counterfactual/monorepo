import { Authorize, Operation, OperationProcessor } from "@ebryn/jsonapi-ts";
import { v4 as generateUUID } from "uuid";

import { getUsers, matchmakeUser } from "../../db";
import { NodeWrapper } from "../../node";
import User, { MatchedUser } from "../user/resource";

import MatchmakingRequest from "./resource";

export default class MatchmakingRequestProcessor extends OperationProcessor<
  MatchmakingRequest
> {
  public resourceClass = MatchmakingRequest;

  @Authorize()
  public async add(op: Operation): Promise<MatchmakingRequest> {
    const user = this.app.user as User;
    let matchedUser: MatchedUser;

    if (op.data.attributes && op.data.attributes.matchmakeWith) {
      const [matchedUserResource] = await getUsers({
        username: op.data.attributes.matchmakeWith
      });
      matchedUser = {
        type: "user",
        id: matchedUserResource.id as string,
        attributes: {
          ethAddress: matchedUserResource.attributes.ethAddress as string,
          nodeAddress: matchedUserResource.attributes.nodeAddress,
          username: matchedUserResource.attributes.username
        },
        relationships: {}
      };
    } else {
      matchedUser = await matchmakeUser(user);
    }

    return new MatchmakingRequest({
      id: generateUUID(),
      attributes: {
        intermediary: NodeWrapper.getNodeAddress(),
        username: matchedUser.attributes.username,
        ethAddress: matchedUser.attributes.ethAddress,
        nodeAddress: matchedUser.attributes.nodeAddress
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
