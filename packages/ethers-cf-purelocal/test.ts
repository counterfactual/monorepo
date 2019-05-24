import { ethers } from "ethers";
import { PureEvmProvider } from "./index";
import assert = require("assert");

let provider = new PureEvmProvider("https://ropsten.infura.io/v3/aa7e165c61a84f25a85905e498267ca7", 'ropsten');

const artifact = require("@counterfactual/contracts/build/ContractRegistry.json")
const eInterface = new ethers.utils.Interface(artifact.abi)

const contractA = new ethers.Contract("0x0be6aB9CE60cb23bAfDA37A665747Dde5FEC9E40", eInterface, provider)
const contractB = new ethers.Contract("0x0be6aB9CE60cb23bAfDA37A665747Dde5FEC9E40", eInterface, ethers.getDefaultProvider('ropsten'))

;(async () => {
  const resultA = await contractA.functions.cfaddress('0x0', 1)
  const resultB = await contractB.functions.cfaddress('0x0', 1)
  assert.equal(resultA, resultB)
})()
