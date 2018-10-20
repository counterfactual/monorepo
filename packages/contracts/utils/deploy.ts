export function deployTruffleArtifacts(
  loader: ArtifactsLoader,
  deployer: TruffleDeployer
) {
  const Conditional = loader.require("Conditional");
  const ConditionalTransaction = loader.require("ConditionalTransaction");
  const MultiSend = loader.require("MultiSend");
  const NonceRegistry = loader.require("NonceRegistry");
  const PaymentApp = loader.require("PaymentApp");
  const ProxyFactory = loader.require("ProxyFactory");
  const Registry = loader.require("Registry");
  const Signatures = loader.require("Signatures");
  const StaticCall = loader.require("StaticCall");
  const Transfer = loader.require("Transfer");
  const VirtualAppAgreement = loader.require("VirtualAppAgreement");
  const ETHBalanceRefundApp = loader.require("ETHBalanceRefundApp");

  deployer.deploy(Transfer).then(() => {
    deployer.link(Transfer, [VirtualAppAgreement, ConditionalTransaction]);
  });
  deployer.deploy(StaticCall).then(() => {
    deployer.link(StaticCall, [ConditionalTransaction, Conditional]);
  });

  deployer.deploy(ConditionalTransaction);
  deployer.deploy(MultiSend);
  deployer.deploy(NonceRegistry);
  deployer.deploy(PaymentApp);
  deployer.deploy(ETHBalanceRefundApp);
  deployer.deploy(ProxyFactory);
  deployer.deploy(Registry);
  deployer.deploy(Signatures);
}
