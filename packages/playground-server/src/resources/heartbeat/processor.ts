import { OperationProcessor } from "@ebryn/jsonapi-ts";

import Heartbeat from "./resource";

export default class HeartbeatProcessor extends OperationProcessor<Heartbeat> {
  public resourceClass = Heartbeat;

  public async get() {
    return [
      {
        type: "heartbeat",
        attributes: {
          schemaVersion: String(process.env.PLAYGROUND_SCHEMA_VERSION),
          maintenanceMode: Boolean(process.env.PLAYGROUND_MAINTENANCE_MODE)
        },
        relationships: {}
      }
    ] as Heartbeat[];
  }
}
