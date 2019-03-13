const ChannelizedCoinShufflePlusApp =
  artifacts.require("ChannelizedCoinShufflePlusApp");

module.exports = (deployer) => {
  deployer.deploy(ChannelizedCoinShufflePlusApp);
}
