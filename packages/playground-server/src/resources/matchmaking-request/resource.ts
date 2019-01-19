import { Resource } from "@ebryn/jsonapi-ts";

export default interface MatchmakingRequest extends Resource {
  attributes: {
    intermediary: string;
  };
  relationships: {
    // users: {};
  };
}
