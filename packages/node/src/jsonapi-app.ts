import { Node } from "@counterfactual/types";
import {
  Application,
  Operation,
  OperationProcessor,
  Resource,
  ResourceAttributes
} from "@ebryn/jsonapi-ts";

import {
  controllersToOperations,
  methodNameToImplementation
} from "./api-router";
import { RequestHandler } from "./request-handler";
import { App, Channel, Proposal } from "./resources";

export default class NodeApplication extends Application {
  constructor(private requestHandler: RequestHandler) {
    super({
      types: [App, Channel, Proposal]
    });

    this.processors = this.buildMetaprocessors();
  }

  // tslint:disable-next-line: prefer-array-literal
  buildMetaprocessors(): (typeof OperationProcessor)[] {
    const metaprocessors = {
      app: class extends OperationProcessor<App> {},
      channel: class extends OperationProcessor<Channel> {},
      proposal: class extends OperationProcessor<Proposal> {}
    };

    Object.keys(controllersToOperations).forEach(controllerName => {
      const implementation: (
        requestHandler: RequestHandler,
        params: Node.MethodParams
      ) => Promise<Node.MethodResult> =
        methodNameToImplementation[controllerName];
      const {
        type,
        op
      }: {
        type: "app" | "channel" | "proposal";
        op: string;
      } = controllersToOperations[controllerName];

      metaprocessors[type].prototype[op] = async (
        operation: Operation
      ): Promise<Resource | Resource[] | void> => {
        const result = (await implementation(
          this.requestHandler,
          operation.data.attributes
        )) as ResourceAttributes;

        return Array.isArray(result)
          ? result.map(
              record =>
                ({
                  id: operation.data.id,
                  type: operation.ref.type,
                  attributes: record,
                  relationships: {}
                } as Resource)
            )
          : {
              id: operation.data.id,
              type: operation.ref.type,
              attributes: result,
              relationships: {}
            };
      };
    });

    return Object.values(metaprocessors) as (typeof OperationProcessor)[];
  }
}
