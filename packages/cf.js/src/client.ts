import { AppFactory } from "./app-factory";
import { AppInstance } from "./app-instance";
import { AppDefinition, NodeProvider } from "./structs";

export enum ClientEventType {
  INSTALL = "install",
  PROPOSE_INSTALL = "proposeInstall",
  REJECT_INSTALL = "rejectInstall"
}

export interface ClientEvent {
  readonly eventType: ClientEventType;
  readonly data: any; // TODO
}

export class Client {
  constructor(readonly nodeProvider: NodeProvider) {}

  async getAppInstances(): Promise<AppInstance[]> {
    return [];
  }

  createAppFactory(appDefinition: AppDefinition): AppFactory {
    return new AppFactory(appDefinition);
  }

  on(eventType: ClientEventType, callback: (e: ClientEvent) => void) {}
}
