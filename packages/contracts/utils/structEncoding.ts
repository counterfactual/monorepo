import * as ethers from "ethers";

export function abiEncodingForStruct(structDefinition: string): string {
  const definitions: string[] = [];
  const lines = structDefinition.split(";");
  for (const line of lines) {
    const definition = line.trim();
    if (definition.length === 0) {
      continue;
    }
    const parts = definition.split(" ");
    if (parts.length !== 2) {
      throw new Error(
        `Invalid struct field. Expected '[type] [name]', got '${definition}'`
      );
    }
    definitions.push(definition);
  }
  return `tuple(${definitions.join(", ")})`;
}

export function encodeStruct(encoding: string, struct: object): string {
  return ethers.utils.defaultAbiCoder.encode([encoding], [struct]);
}
