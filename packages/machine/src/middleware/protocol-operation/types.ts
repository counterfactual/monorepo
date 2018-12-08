import { ethers } from "ethers";

import MultiSendJson from "@counterfactual/contracts/build/contracts/MultiSend.json";

export abstract class ProtocolOperation {
  public abstract hashToSign(): string;
  public abstract transaction(sigs: ethers.utils.Signature[]): Transaction;
}

const { defaultAbiCoder } = ethers.utils;

export enum Operation {
  Call = 0,
  Delegatecall = 1
}

export class Transaction {
  constructor(
    readonly to: string,
    readonly value: number,
    readonly data: string
  ) {}
}

export class MultisigTransaction extends Transaction {
  constructor(
    readonly to: string,
    readonly value: number,
    readonly data: string,
    readonly operation: Operation
  ) {
    super(to, value, data);
  }
}

export class MultisigInput {
  constructor(
    readonly to: string,
    readonly val: number,
    readonly data: string,
    readonly op: Operation,
    readonly signatures?: ethers.utils.Signature[]
  ) {}
}

export class MultiSend {
  constructor(readonly transactions: MultisigInput[]) {}

  public input(multisend: string): MultisigInput {
    let txs: string = "0x";

    for (const transaction of this.transactions) {
      txs += defaultAbiCoder
        .encode(
          ["uint256", "address", "uint256", "bytes"],
          [transaction.op, transaction.to, transaction.val, transaction.data]
        )
        .substr(2);
    }

    const data = new ethers.utils.Interface(
      MultiSendJson.abi
    ).functions.multiSend.encode([txs]);

    return new MultisigInput(multisend, 0, data, Operation.Delegatecall);
  }
}
