import * as ethers from "ethers";

export class SolidityStructType {
  public readonly definitions: string[] = [];

  constructor(solidityDefinition: string) {
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
      this.definitions.push(definition);
    }
  }

  public new(values: { [name: string]: any }): SolidityStruct {
    return new SolidityStruct(this, values);
  }
}

export class SolidityStruct {
  constructor(
    private structType: SolidityStructType,
    private values: { [name: string]: any }
  ) {}

  private get _encoding(): string {
    return `tuple(${this.structType.definitions.join(", ")})`;
  }

  public keccak256(): string {
    const encoded = this.encodeBytes();
    return ethers.utils.solidityKeccak256(["bytes"], [encoded]);
  }

  public encodeBytes(): string {
    return ethers.utils.defaultAbiCoder.encode(
      [this._encoding],
      [this.asObject()]
    );
  }

  public asObject(): { [k: string]: any } {
    const values: { [k: string]: any } = {};
    Object.keys(this.values).forEach(name => {
      let value = this.values[name];
      if (value instanceof ethers.types.BigNumber) {
        value = value.toHexString();
      }
      values[name] = value;
    });
    return values;
  }

  public clone(newValues: { [k: string]: any }): SolidityStruct {
    const values = this.asObject();
    return this.structType.new({
      ...values,
      ...newValues
    });
  }
}
