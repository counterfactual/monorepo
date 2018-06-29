import { assert } from "chai";
import * as ethers from "ethers";

import { deployMultisig, getCFHelper } from "../helpers/cfhelpers.js";

const AssetDispatcher = artifacts.require("AssetDispatcher");
const ConditionalTransfer = artifacts.require("ConditionalTransfer");
const Registry = artifacts.require("Registry");

const BytesApp = artifacts.require("BytesApp");

const WithdrawModule = artifacts.require("WithdrawModule");

// skip these tests until https://github.com/trufflesuite/ganache-core/issues/98 is resolved
contract("Withdrawing", accounts => {
  const web3 = (global as any).web3;

  let registry: ethers.Contract;
  let assetDispatcher: ethers.Contract;
  let conditionalTransfer: ethers.Contract;
  let signer: ethers.Wallet;

  const provider = new ethers.providers.Web3Provider(web3.currentProvider);

  beforeEach(async () => {
    registry = new ethers.Contract(
      (await Registry.deployed()).address,
      Registry.abi,
      await provider.getSigner(accounts[0]) // uses signer for registry.deploy
    );
    assetDispatcher = new ethers.Contract(
      (await AssetDispatcher.deployed()).address,
      AssetDispatcher.abi,
      provider
    );
    conditionalTransfer = new ethers.Contract(
      (await ConditionalTransfer.deployed()).address,
      ConditionalTransfer.abi,
      provider
    );
    signer = ethers.Wallet.createRandom({}).connect(provider);
  });

  it("securely follows withdrawal technique", async () => {
    // A and B are the participants of the state channel in this example.

    const A =
      // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
      new ethers.Wallet(
        "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
      );

    // Deploy a multisignature wallet.
    // note: for the test case, it is 1-of-1, but in reality this would be 2-of-2 for
    //       A and B

    const multisig = await deployMultisig([signer.address]);
    const helper = await getCFHelper(multisig, registry, provider);

    // Set up counterfactual object Nonce.

    // In this test case, they get deployed through the registry, but they need not
    // be deployed in an actual use case. This is just for convenience in the test case.

    const nonce = await helper.deployAppWithState(
      BytesApp,
      "uint256",
      0,
      signer
    );

    const withdraw = await helper.deployAppWithState(
      BytesApp,
      "tuple(address,address,uint256)",
      [A.address, multisig.address, ethers.utils.parseEther("0")],
      signer
    );

    const withdrawInterpreter = await helper.deploy(WithdrawModule);

    // Fund the multisig.

    const moneybags = await provider.getSigner(accounts[0]);
    await moneybags.sendTransaction({
      to: multisig.address,
      value: ethers.utils.parseEther("1")
    });

    // Commitment #1, which says that A may withdraw into the multisig.
    await helper.delegatecall(
      conditionalTransfer.address,
      signer,
      conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
        [
          {
            expectedValue: ethers.utils.defaultAbiCoder.encode(
              ["uint256"],
              [0]
            ),
            func: {
              dest: helper.cfaddressOf(nonce),
              selector:
                nonce.contract.interface.functions.getExternalState.sighash
            },
            parameters: "0x"
          }
        ],
        {
          dest: helper.cfaddressOf(withdraw),
          selector:
            withdraw.contract.interface.functions.getExternalState.sighash
        },
        [
          {
            dest: helper.cfaddressOf(withdrawInterpreter),
            selector:
              withdrawInterpreter.contract.interface.functions.interpret.sighash
          }
        ],
        {
          dest: helper.cfaddressOf(assetDispatcher),
          selector: assetDispatcher.interface.functions.transferETH.sighash
        }
      ])
    );

    assert.equal(
      (await provider.getBalance(A.address)).toString(),
      ethers.utils.parseEther("1").toString()
    );

    assert.equal(
      (await provider.getBalance(multisig.address)).toString(),
      ethers.utils.parseEther("0").toString()
    );
  });
});
