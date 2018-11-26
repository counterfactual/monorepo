import { AppDefinition } from "./types/protocol-types";

export class AppFactory {
  constructor(readonly appDefinition: AppDefinition) {}
}
