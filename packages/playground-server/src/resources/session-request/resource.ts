import { Resource } from "@ebryn/jsonapi-ts";

export default interface SessionRequest extends Resource {
  attributes: {
    ethAddress: string;
  };
}
