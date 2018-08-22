import { BuildArtifact } from "@counterfactual/typescript-typings";

export interface ArtifactsLoader {
  require(name: string): BuildArtifact;
}

export interface TruffleDeployer {
  deploy(artifact: BuildArtifact);

  link(artifact: BuildArtifact, libraries: BuildArtifact[]);
}

export async function deployTruffle(
  loader: ArtifactsLoader,
  deployer: TruffleDeployer
) {
  const Registry = loader.require("Registry");
  const NonceRegistry = loader.require("NonceRegistry");
  const ConditionalTransfer = loader.require("ConditionalTransfer");
  const VirtualAppAgreement = loader.require("VirtualAppAgreement");
  const ProxyFactory = loader.require("ProxyFactory");
  const MultiSend = loader.require("MultiSend");
  const StaticCall = loader.require("StaticCall");
  const Signatures = loader.require("Signatures");
  const Conditional = loader.require("Conditional");
  const Transfer = loader.require("Transfer");

  deployer.deploy(Transfer);
  deployer.link(Transfer, [VirtualAppAgreement, ConditionalTransfer]);
  deployer.deploy(StaticCall);
  deployer.link(StaticCall, [ConditionalTransfer, Conditional]);

  deployer.deploy(Signatures);
  deployer.deploy(NonceRegistry);
  deployer.deploy(MultiSend);
  deployer.deploy(ProxyFactory);
  deployer.deploy(Registry);
  deployer.deploy(ConditionalTransfer);
}
