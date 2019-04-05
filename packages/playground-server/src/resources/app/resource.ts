import { Resource } from "@ebryn/jsonapi-ts";

export default class App extends Resource {
  static get type() {
    return "app";
  }

  static attributes = {
    name: "",
    slug: "",
    icon: "",
    url: ""
  };
}
