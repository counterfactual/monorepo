import { Resource } from "@ebryn/jsonapi-ts";

export default class Heartbeat extends Resource {
  attributes: {
    schemaVersion: string;
    maintenanceMode: boolean;
  };
}
