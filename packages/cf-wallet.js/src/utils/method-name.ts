import { JsonApi } from "@counterfactual/types";

export function deriveMethodName(operation: JsonApi.Operation): string {
  return `${operation.op}:${operation.ref.type}`;
}
