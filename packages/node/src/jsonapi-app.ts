import { Node } from "@counterfactual/types";
import {
  Application,
  Operation,
  OperationProcessor,
  Resource,
  ResourceAttributes,
  authorizeMiddleware,
  HasId,
  JsonApiErrors
} from "@ebryn/jsonapi-ts";

import {
  controllersToOperations,
  methodNameToImplementation
} from "./api-router";
import { RequestHandler } from "./request-handler";
import { App, Channel, Proposal } from "./resources";
import User from "./resources/user";

export default class NodeApplication extends Application {
  constructor(private requestHandler: RequestHandler) {
    super({
      types: [App, Channel, Proposal],
      defaultProcessor: OperationProcessor
    });

    this.processors = this.buildMetaprocessors();
  }

  // tslint:disable-next-line: prefer-array-literal
  buildMetaprocessors(): (typeof OperationProcessor)[] {
    const metaprocessors = {
      user: class extends OperationProcessor<User> {
        public static resourceClass = User;

        public async identify(op: Operation): Promise<HasId> {
          return {
            id: "foo"
          };
        }

        public async login(op: Operation): Promise<HasId> {
          if (op.data.attributes.token === "baz") {
            return this.identify(op);
          }

          throw JsonApiErrors.Unauthorized();
        }
      }
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

      this.processorFor(type)
        .then(processor => {
          console.log(`Implementing ${type}:${op} for processor`, processor);
          processor!.constructor.prototype[op] = authorizeMiddleware(
            async (
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
            },
            []
          ).bind(processor);
        })
        .catch(error => console.error(error));
    });

    return Object.values(metaprocessors) as (typeof OperationProcessor)[];
  }
}
