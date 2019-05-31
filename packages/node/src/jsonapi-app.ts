import { Node } from "@counterfactual/types";
import {
  Application,
  HasId,
  Operation,
  OperationProcessor,
  OperationResponse,
  Resource
} from "@ebryn/jsonapi-ts";

import {
  controllersToOperations,
  methodNameToImplementation
} from "./api-router";
import { RequestHandler } from "./request-handler";
import { App, Channel, Proposal } from "./resources";

class AppProcessor<T extends Resource = App> extends OperationProcessor<T> {
  static resourceClass = App;
}

class ChannelProcessor<T extends Resource = Channel> extends OperationProcessor<
  T
> {
  static resourceClass = Channel;
}

class ProposalProcessor<
  T extends Resource = Proposal
> extends OperationProcessor<T> {
  static resourceClass = Proposal;
}

export default class NodeApplication extends Application {
  constructor(private requestHandler: RequestHandler) {
    super({
      types: [App, Channel, Proposal],
      processors: [AppProcessor, ChannelProcessor, ProposalProcessor]
    });
  }

  async bootstrap() {
    await this.buildOperationMethods();
  }

  async executeOperation(
    op: Operation,
    processor: OperationProcessor<Resource>
  ): Promise<OperationResponse> {
    const result = await processor.execute(op);

    return {
      data: result || null,
      included: []
    };
  }

  async buildOperationMethods(): Promise<void> {
    await Promise.all(
      Object.keys(controllersToOperations).map(async controllerName => {
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

        const processor = await this.processorFor(type);

        if (!processor) {
          console.error(
            "Attempted to bind ",
            type,
            op,
            "to an undefined processor"
          );
          return;
        }

        processor.constructor.prototype[op] = async (
          operation: Operation
        ): Promise<HasId | HasId[] | {}> => {
          const data = operation.data as Resource;
          const result = await implementation(
            this.requestHandler,
            data.attributes
          );

          return Array.isArray(result)
            ? result.map(record =>
                !record["id"] ? { ...result, id: "" } : record
              )
            : !result["id"]
            ? { ...result, id: "" }
            : result;
        };
      })
    );
  }
}