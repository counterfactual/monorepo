import { assert } from "chai";
import * as ethers from "ethers";

import { zeroAddress, zeroBytes32 } from "../helpers/utils.js";

import { deployMultisig, getCFHelper } from "../helpers/cfhelpers.js";

const AssetDispatcher = artifacts.require("AssetDispatcher");
const ConditionalTransfer = artifacts.require("ConditionalTransfer");
const Registry = artifacts.require("Registry");

const TicTacToeModule = artifacts.require("TicTacToeModule");

contract("Simple ConditionalTransfer Examples", accounts => {
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

	it("handles uncommon state (e.g., tictactoe)", async () => {
		const [EMPTY, X, O] = [0, 1, 2];
		const X_WON = 2;

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

		const multisig = await deployMultisig([signer.address]);

		const helper = await getCFHelper(multisig, registry, provider);

		const moneybags = await provider.getSigner(accounts[0]);
		await moneybags.sendTransaction({
			to: multisig.address,
			value: ethers.utils.parseEther("1")
		});

		const nonce = await helper.deployAppWithState(
			ethers.utils.defaultAbiCoder.encode(["uint256"], [0]),
			signer
		);

		const tictactoe = await helper.deployAppWithState(
			ethers.utils.defaultAbiCoder.encode(
				["tuple(uint256,uint256[9])"],
				[[X_WON, [X, X, X, O, O, EMPTY, EMPTY, EMPTY, EMPTY]]]
			),
			signer
		);

		const tttModule = await helper.deploy(TicTacToeModule, [
			ethers.utils.parseEther("1"),
			[A.address, B.address]
		]);

		assert.equal(
			(await provider.getBalance(A.address)).toString(),
			ethers.utils.parseEther("0").toString()
		);

		assert.equal(
			(await provider.getBalance(A.address)).toString(),
			ethers.utils.parseEther("0").toString()
		);

		assert.equal(
			(await provider.getBalance(multisig.address)).toString(),
			ethers.utils.parseEther("1").toString()
		);

		await helper.delegatecall(
			// Make a call to the ConditionalTransfer contract.
			conditionalTransfer.address,

			// Signed by the signer (1-of-1 confirmer of the multisig in this test)
			signer,

			// Execute a conditional payment call
			conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
				// The following conditions must be met:
				// - nonce = 0
				[
					{
						expectedValue: ethers.utils.defaultAbiCoder.encode(
							["uint256"],
							[0]
						),
						func: {
							dest: helper.cfaddressOf(nonce),
							selector: nonce.contract.interface.functions.getAppState.sighash
						},
						parameters: zeroBytes32
					}
				],

				// The source data comes from tictactoe.getState
				{
					dest: helper.cfaddressOf(tictactoe),
					selector: tictactoe.contract.interface.functions.getAppState.sighash
				},

				// The data will be piped through <get data> | tttModule.interpret
				[
					{
						dest: helper.cfaddressOf(tttModule),
						selector: tttModule.contract.interface.functions.interpret.sighash
					}
				],

				// The result of the pipe command will be sent to this transfer function
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
			(await provider.getBalance(B.address)).toString(),
			ethers.utils.parseEther("0").toString()
		);

		assert.equal(
			(await provider.getBalance(multisig.address)).toString(),
			ethers.utils.parseEther("0").toString()
		);
	});

	it("handles empty condition case (e.g., unipaymentchannel)", async () => {
		const A =
			// 0xD9394A8E069134A142f54902F97fe4218638b6a3
			new ethers.Wallet(
				"0x8bcf439c9485f1d63fde7841d893e6df5fb5968560f87ccbac0488ee53ca5a9c"
			);

		const multisig = await deployMultisig([signer.address]);

		const helper = await getCFHelper(multisig, registry, provider);

		const moneybags = await provider.getSigner(accounts[0]);
		await moneybags.sendTransaction({
			to: multisig.address,
			value: ethers.utils.parseEther("1")
		});

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
							ethers.utils.parseEther("0.5")
						]
					]
				]
			),
			signer
		);

		assert.equal(
			(await provider.getBalance(A.address)).toString(),
			ethers.utils.parseEther("0").toString()
		);

		assert.equal(
			(await provider.getBalance(A.address)).toString(),
			ethers.utils.parseEther("0").toString()
		);

		assert.equal(
			(await provider.getBalance(multisig.address)).toString(),
			ethers.utils.parseEther("1").toString()
		);

		await helper.delegatecall(
			// Make a call to the ConditionalTransfer contract.
			conditionalTransfer.address,

			// Signed by the signer (1-of-1 confirmer of the multisig in this test)
			signer,

			// Execute a conditional payment call
			conditionalTransfer.interface.functions.makeConditionalTransfer.encode([
				// No conditions! Special property of unidirectional payment channel
				// is that the funds, once allocated to unidirectional, must be instant
				// withdrawable (actually instant -- 0 timeout)
				[],

				// The source data comes from ethbalance.getState
				{
					dest: helper.cfaddressOf(ethbalance),
					selector: ethbalance.contract.interface.functions.getAppState.sighash
				},

				// No tttModule function, pretty basic
				[],

				// The result of the pipe command will be sent to this transfer function
				{
					dest: helper.cfaddressOf(assetDispatcher),
					selector: assetDispatcher.interface.functions.transferETH.sighash
				}
			])
		);

		assert.equal(
			(await provider.getBalance(A.address)).toString(),
			ethers.utils.parseEther("0.5").toString()
		);

		assert.equal(
			(await provider.getBalance(multisig.address)).toString(),
			ethers.utils.parseEther("0.5").toString()
		);
	});
});
