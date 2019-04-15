import { Resource } from "@ebryn/jsonapi-ts";

export default class User extends Resource {
  static schema = {
    attributes: {
      name: String
    },
    relationships: {}
  };
}
