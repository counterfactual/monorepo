import * as ethers from "ethers";

export class StructAbiEncoder {
  public static fromDefinition(solidityDefinition: string): StructAbiEncoder {
    const definitions: string[] = [];
    const lines = solidityDefinition.split(";");
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
    const encoding = `tuple(${definitions.join(", ")})`;
    return new StructAbiEncoder(encoding);
  }

  constructor(readonly encoding: string) {}

  public encode(struct: { [k: string]: any }): string {
    return ethers.utils.defaultAbiCoder.encode([this.encoding], [struct]);
  }

  public decode(bytes: string): { [k: string]: any } {
    return ethers.utils.defaultAbiCoder.decode([this.encoding], bytes)[0];
  }
}
