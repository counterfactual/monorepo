import { Signature } from "ethers/utils";

export abstract class EthereumCommitment {
  public abstract hashToSign(): string;
  public abstract transaction(sigs: Signature[]): Transaction;
}

export enum MultisigOperation {
  Call = 0,
  Delegatecall = 1,
  // Gnosis Safe uses "2" for CREATE, but we don't actually
  // make use of it in our code. Still, I put this here to be
  // maximally explicit that we based the data structure on
  // Gnosis's implementation of a Multisig
  Create = 2
}

export type Transaction = {
  to: string;
  value: number;
  data: string;
};

export type MultisigTransaction = Transaction & {
  operation: MultisigOperation;
};

export type ExecTransactionCalldata = MultisigTransaction & {
  signatures: Signature[];
};
