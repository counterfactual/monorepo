const ProxyFactory = require("./build/ProxyFactory.json");

const ethers = require("ethers");

const Contract = ethers.Contract;
const ContractFactory = ethers.ContractFactory
const Wallet = ethers.Wallet;
const InfuraProvider = ethers.providers.InfuraProvider;
const getContractAddress = ethers.utils.getContractAddress;

const provider = new InfuraProvider("kovan", process.env.INFURA_API_KEY);
const wallet = Wallet.fromMnemonic(process.env.ETH_ACCOUNT_MNENOMIC).connect(provider);

new ContractFactory(ProxyFactory.abi, ProxyFactory.evm.bytecode.object, wallet)
  .deploy({ gasLimit: 1500000 })
  .then(tx => {
    tx.deployed()
      .then(contract =>
        console.info(JSON.stringify(contract, null, 2))
      )
      .catch(console.error)
  })
  .catch(console.error);
