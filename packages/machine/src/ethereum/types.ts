import { Signature } from "ethers/utils";

export abstract class EthereumCommitment {
  // todo(ldct): hack hack hack
  public abstract hashToSign(signerIsIntermediary?: boolean): string;
  public abstract transaction(
    signatures: Signature[],
    intermediarySignature?: Signature
  ): Transaction;
}

export enum MultisigOperation {
  Call = 0,
  DelegateCall = 1,
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
