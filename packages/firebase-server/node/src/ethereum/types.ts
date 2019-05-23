import { BigNumber, Signature } from "ethers/utils";

export abstract class EthereumCommitment {
  // todo(xuanji): EthereumCommitment was designed under the assumption that
  // `hashToSign` returns the same hash for different signers. However, in the
  // install-virtual-app protocol, the hash that the intermediary signs is
  // different from the one the other participants sign. The optional
  // `signerIsIntermediary` flag is a hack that is only used by the
  // `install-virtual-app protocol`. `intermediarySignature` in `transaction`
  // is the same kind of hack.
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
  value: BigNumber | number;
  data: string;
};

export type MultisigTransaction = Transaction & {
  operation: MultisigOperation;
};
