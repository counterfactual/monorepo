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
    console.log("matchmaking post");
    return Promise.reject("matchmaking error");
  }
}
