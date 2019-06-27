import { Resource } from "@ebryn/jsonapi-ts";

export default class MatchmakingRequest extends Resource {
  static get type() {
    return "matchmakingRequest";
  }

  static attributes = {
    intermediary: "",
    username: "",
    ethAddress: "",
    nodeAddress: ""
  };
  // attributes: {
  //   intermediary: string;
  // };
  // relationships: {
  //   users: {};
  // };
}
