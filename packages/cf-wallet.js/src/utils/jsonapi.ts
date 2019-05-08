import { JsonApi, Node } from "@counterfactual/types";

export function deriveMethodName(
  operation: JsonApi.Operation
): Node.JsonApiMethodName {
  return `${operation.ref.type}:${operation.op}` as Node.JsonApiMethodName;
}
