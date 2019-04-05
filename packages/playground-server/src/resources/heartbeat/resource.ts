import { Resource } from "@ebryn/jsonapi-ts";

export default class Heartbeat extends Resource {
  static get type() {
    return "heartbeat";
  }

  static attributes = {
    schemaVersion: "",
    maintenanceMode: false
  };
}
