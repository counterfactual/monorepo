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
export const ConditionalTransaction = AbstractContract.loadBuildArtifact(
  "ConditionalTransaction"
);

// tslint:disable-next-line
export const NonceRegistry = AbstractContract.loadBuildArtifact(
  "NonceRegistry"
);

// tslint:disable-next-line
export const Registry = AbstractContract.loadBuildArtifact("Registry");

// tslint:disable-next-line
export const StaticCall = AbstractContract.loadBuildArtifact("StaticCall");

// tslint:disable-next-line
export const Signatures = AbstractContract.loadBuildArtifact("Signatures");

// tslint:disable-next-line
export const Transfer = AbstractContract.loadBuildArtifact("Transfer");

// tslint:disable-next-line
export const AppInstance = AbstractContract.loadBuildArtifact("AppInstance", {
  "StaticCall": StaticCall,
  "Signatures": Signatures,
  "Transfer": Transfer
});

// tslint:disable-next-line
export const MinimumViableMultisig = AbstractContract.loadBuildArtifact(
  "MinimumViableMultisig",
  {
    "Signatures": Signatures
  }
);

export default {
  ConditionalTransaction,
  NonceRegistry,
  Registry,
  StaticCall,
  MinimumViableMultisig,
  Signatures,
  Transfer,
  AppInstance
};
