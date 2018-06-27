import { assert } from "chai";
import * as ethers from "ethers";

import { zeroAddress } from "../helpers/utils.js";

import { deployMultisig, getCFHelper } from "../helpers/cfhelpers.js";

const AssetDispatcher = artifacts.require("AssetDispatcher");
const ConditionalTransfer = artifacts.require("ConditionalTransfer");
const Registry = artifacts.require("Registry");

const WithdrawModule = artifacts.require("WithdrawModule");

contract("Multiple Apps", accounts => {
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

	it("allows for there to be multiple apps (using vector nonce)", async () => {
		// A and B are the participants of the state channel in this example.

		const [A, B] = [
			// 0xb37e49bFC97A948617bF3B63BC6942BB15285715
			new ethers.Wallet(
				"0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
			),
			// 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
			new ethers.Wallet(
				"0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
			)
		];

		// Deploy a multisignature wallet.
		// note: for the test case, it is 1-of-1, but in reality this would be 2-of-2 for
		//       A and B

		const multisig = await deployMultisig([signer.address]);
		const helper = await getCFHelper(multisig, registry, provider);

		// In this test case, they get deployed through the registry, but they need not
		// be deployed in an actual use case. This is just for convenience in the test case.

		const withdraw = await helper.deployAppWithState(
			ethers.utils.defaultAbiCoder.encode(
				["tuple(address,address,uint256)"],
				[[B.address, multisig.address, ethers.utils.parseEther("3")]]
			),
			signer
		);

		const ethbalance = await helper.deployAppWithState(
			ethers.utils.defaultAbiCoder.encode(
				["tuple(tuple(address,bytes32),uint256)[]"],
				[
					// abiCoder
					[
						// array
						[
							// tuple
							[
								// tuple
								zeroAddress,
								ethers.utils.defaultAbiCoder.encode(["bytes32"], [A.address])
							],
							ethers.utils.parseEther("1.5")
						],
						[
							// tuple
							[
								// tuple
								zeroAddress,
								ethers.utils.defaultAbiCoder.encode(["bytes32"], [B.address])
							],
							ethers.utils.parseEther("1.5")
						]
					]
				]
			),
			signer
		);

		const nonce1 = await helper.deployAppWithState(
			ethers.utils.defaultAbiCoder.encode(["uint256"], [1000]),
			signer
		);

		const nonce2 = await helper.deployAppWithState(
			ethers.utils.defaultAbiCoder.encode(["uint256"], [2000]),
			signer
		);

		const withdrawInterpreter = await helper.deploy(WithdrawModule);

		// Fund the multisig.

		const moneybags = await provider.getSigner(accounts[0]);
		await moneybags.sendTransaction({
			to: multisig.address,
			value: ethers.utils.parseEther("5")
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
							[1000]
						),
						func: {
							dest: helper.cfaddressOf(nonce1),
							selector: nonce1.contract.interface.functions.getAppState.sighash
						},
						parameters: "0x"
					}
				],
				{
					dest: helper.cfaddressOf(withdraw),
					selector: withdraw.contract.interface.functions.getAppState.sighash
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
			(await provider.getBalance(B.address)).toString(),
			ethers.utils.parseEther("2").toString()
		);

		assert.equal(
			(await provider.getBalance(multisig.address)).toString(),
			ethers.utils.parseEther("3").toString()
		);

		// Commitment #2
		await helper.delegatecall(
			conditionalTransfer.address,
			signer,
			conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
				[
					{
						expectedValue: ethers.utils.defaultAbiCoder.encode(
							["uint256"],
							[2000]
						),
						func: {
							dest: helper.cfaddressOf(nonce2),
							selector: nonce2.contract.interface.functions.getAppState.sighash
						},
						parameters: "0x"
					}
				],
				{
					dest: helper.cfaddressOf(ethbalance),
					selector: ethbalance.contract.interface.functions.getAppState.sighash
				},
				[],
				{
					dest: helper.cfaddressOf(assetDispatcher),
					selector: assetDispatcher.interface.functions.transferETH.sighash
				}
			])
		);

		assert.equal(
			(await provider.getBalance(A.address)).toString(),
			ethers.utils.parseEther("1.5").toString()
		);

		assert.equal(
			(await provider.getBalance(B.address)).toString(),
			ethers.utils.parseEther("3.5").toString()
		);

		assert.equal(
			(await provider.getBalance(multisig.address)).toString(),
			ethers.utils.parseEther("0").toString()
		);
	});
});
