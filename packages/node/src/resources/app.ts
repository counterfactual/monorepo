import { Resource } from "@ebryn/jsonapi-ts";

export default class App extends Resource {
  static schema = {
    attributes: {
      appInstanceId: String,
      intermediaries: Array,
      intermediaryIdentifier: String,
      appInstance: Object,
      action: Object,
      newState: Object,
      state: Object
    },

    relationships: {}
  };
}
