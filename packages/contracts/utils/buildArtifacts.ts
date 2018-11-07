/**
 * TODO:
 * This file has several tslint:disable-next-line rules because it violates the
 * rule of variables being camelCase or UPPER_CASE only. We do this because this is
 * a bizarre case where these variables are BuildArtifacts which naturally
 * represent JSON ABIs of smart contracts in a TypeScript type. We ought to clean this
 * up a bit in the future.
 */
import { AbstractContract } from "./contract";

// tslint:disable-next-line
export const ConditionalTransaction = AbstractContract.fromArtifactName(
  "ConditionalTransaction"
);

// tslint:disable-next-line
export const NonceRegistry = AbstractContract.fromArtifactName(
  "NonceRegistry"
);

// tslint:disable-next-line
export const Registry = AbstractContract.fromArtifactName("Registry");

// tslint:disable-next-line
export const StaticCall = AbstractContract.fromArtifactName("StaticCall");

// tslint:disable-next-line
export const Signatures = AbstractContract.fromArtifactName("Signatures");

// tslint:disable-next-line
export const Transfer = AbstractContract.fromArtifactName("Transfer");

// tslint:disable-next-line
export const AppInstance = AbstractContract.fromArtifactName("AppInstance", {
  StaticCall,
  Signatures,
  Transfer
});

// tslint:disable-next-line
export const MinimumViableMultisig = AbstractContract.fromArtifactName(
  "MinimumViableMultisig",
  {
    Signatures
  }
);

// tslint:disable-next-line
export const VirtualAppAgreement = AbstractContract.fromArtifactName(
  "VirtualAppAgreement",
  {
    Transfer,
    Registry
  }
);

export default {
  AppInstance,
  ConditionalTransaction,
  MinimumViableMultisig,
  NonceRegistry,
  Registry,
  Signatures,
  StaticCall,
  Transfer,
  VirtualAppAgreement
};
