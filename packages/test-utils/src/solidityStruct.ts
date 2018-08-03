import * as ethers from "ethers";

/**
 * Convenience class to define a Solidity struct type to create instances of Solidity structs.
 * See SolidityStruct class for instance methods.
 * @example
 *  const AppState = new SolidityStructType(`
 *    uint256 someNumber;
 *    address[] someAddresses;
 *  `);
 *  const appState = AppState.new({
 *    someNumber: 3,
 *    someAddresses: ["0xbb..", "0xaa.."]
 *  });
 *
 */
export class SolidityStructType {
  /**
   * Struct field definitions. Format: "[type] [name]" e.g. "uint256 someNumber"
   */
  public readonly definitions: string[] = [];

  /**
   * Create a new Solidity struct type from definition.
   * @param solidityDefinition The Solidity definition of the struct fields. `uint256` should be substituted for Enum types.
   * @example
   *   new SolidityStructType(`
   *     uint256 someEnum;
   *     address[] someAddresses;
   *   `);
   * @throws Error if Solidity definition in a bad format.
   */
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

  /**
   * Create a new SolidityStruct instance of this type.
   * Ensure the values are the correct types, as they are not type checked.
   * @param values The values to assign to the struct fields.
   */
  public new(values: { [name: string]: any }): SolidityStruct {
    return new SolidityStruct(this, values);
  }
}

/**
 * Solidity struct convenience class for use with Counterfactual framework.
 */
export class SolidityStruct {
  constructor(
    private structType: SolidityStructType,
    private values: { [name: string]: any }
  ) {}

  private get _encoding(): string {
    return `tuple(${this.structType.definitions.join(", ")})`;
  }

  /**
   * Compute the keccak256 hash of the ABI encoded representation of this struct.
   * @returns string 32-byte keccak256 hash
   */
  public keccak256(): string {
    const encoded = this.encodeBytes();
    return ethers.utils.solidityKeccak256(["bytes"], [encoded]);
  }

  /**
   * ABI encode this struct.
   * @returns string bytestring of the ABI encoding
   */
  public encodeBytes(): string {
    return ethers.utils.defaultAbiCoder.encode(
      [this._encoding],
      [this.asObject()]
    );
  }

  /**
   * The struct as a Javascript object for use in a contract call.
   */
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

  /**
   * Clone this struct and assign new values to the fields.
   * @param newValues New values to assign
   * @returns SolidityStruct New struct of same Solidity struct type with new values
   */
  public clone(newValues: { [k: string]: any }): SolidityStruct {
    const values = this.asObject();
    return this.structType.new({
      ...values,
      ...newValues
    });
  }
}
