import * as cf from "@counterfactual/cf.js";
import MultiSendJson from "@counterfactual/contracts/build/contracts/MultiSend.json";
import { ethers } from "ethers";

export abstract class ProtocolOperation {
  public abstract hashToSign(): cf.legacy.utils.H256;

  public abstract transaction(sigs: ethers.utils.Signature[]): Transaction;
}

const { abi } = cf.utils;

export enum Operation {
  Call = 0,
  Delegatecall = 1
}

export class Transaction {
  constructor(
    readonly to: cf.legacy.utils.Address,
    readonly value: number,
    readonly data: string
  ) {}
}

export class MultisigTransaction extends Transaction {
  constructor(
    readonly to: cf.legacy.utils.Address,
    readonly value: number,
    readonly data: cf.legacy.utils.Bytes,
    readonly operation: Operation
  ) {
    super(to, value, data);
  }
}

export class MultisigInput {
  constructor(
    readonly to: cf.legacy.utils.Address,
    readonly val: number,
    readonly data: cf.legacy.utils.Bytes,
    readonly op: Operation,
    readonly signatures?: ethers.utils.Signature[]
  ) {}
}

export class MultiSend {
  constructor(
    readonly transactions: MultisigInput[],
    readonly networkContext: cf.legacy.network.NetworkContext
  ) {}

  public input(multisend: cf.legacy.utils.Address): MultisigInput {
    let txs: string = "0x";
    for (const transaction of this.transactions) {
      txs += abi
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
