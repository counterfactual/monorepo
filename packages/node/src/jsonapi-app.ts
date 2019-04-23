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
      types: [App, Channel, Proposal],
      defaultProcessor: OperationProcessor
    });

    this.buildOperationMethods();
  }

  // tslint:disable-next-line: prefer-array-literal
  buildOperationMethods(): void {
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

      this.processorFor(type)
        .then(processor => {
          processor!.constructor.prototype[op] = async (
            operation: Operation
          ): Promise<Resource | Resource[] | void> => {
            const data = operation.data as Resource;
            const result = (await implementation(
              this.requestHandler,
              data.attributes
            )) as ResourceAttributes;

            return Array.isArray(result)
              ? result.map(
                  record =>
                    ({
                      id: data.id,
                      type: operation.ref.type,
                      attributes: record,
                      relationships: {}
                    } as Resource)
                )
              : {
                  id: data.id,
                  type: operation.ref.type,
                  attributes: result,
                  relationships: {}
                };
          };
        })
        .catch(error => console.error(error));
    });
  }
}
