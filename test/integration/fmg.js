const ethers = require("ethers");

const {
	signMessage,
	zeroBytes32,
	evm_mine,
} = require("../helpers/utils.js");

const {
	getCFHelper,
	deployMultisig,
} = require("../helpers/cfhelpers.js");

const DelegateTargets        = artifacts.require("DelegateTargets");
const Conditional            = artifacts.require("Conditional");
const ForceMoveGame          = artifacts.require("ForceMoveGame");
const Registry               = artifacts.require("Registry");
const TicTacToe              = artifacts.require("TicTacToe");
const TicTacToeInterpreter   = artifacts.require("TicTacToeInterpreter");

// skip these tests until https://github.com/trufflesuite/ganache-core/issues/98 is resolved
contract.skip("TicTacToe for ETH", (accounts) => {

	let registry,
		delegateTargets,
		signer;

	const provider = new ethers.providers.Web3Provider(web3.currentProvider);

	beforeEach(async () => {
		registry = await Registry.deployed();
		delegateTargets =  new ethers.Contract(
			(await DelegateTargets.deployed()).address,
			DelegateTargets.abi,
			provider
		);
		signer = ethers.Wallet.createRandom();
		signer.provider = provider;
	});

	it("can do end to end test", async () => {

		const [X_TURN, O_TURN, X_WON, O_WON] = [0, 1, 2, 3]; // eslint-disable-line no-unused-vars

		const [X, O, EMPTY] = [0, 1, 2];

		let A = ethers.Wallet.createRandom();
		let B = ethers.Wallet.createRandom();

		const moveHelper = (turnNum, gameState, signer) => {
			const move = {
				state: {
					turnNum,
					channel: {
						gameType: ttt.address,
						participants: [A.address, B.address],
					},
					gameState: ethers.utils.AbiCoder.defaultCoder.encode(
						["tuple(uint256,uint256[9])"],
						[gameState]
					),
					resolutionTransform: zeroBytes32,
				}
			};
			move.signature = signMessage(
				ethers.utils.solidityKeccak256(
					["bytes1", "bytes", "uint256", "bytes32"],
					["0x19", move.state.gameState, move.state.turnNum, ethers.utils.solidityKeccak256(
						["address", "address[]"],
						[
							move.state.channel.gameType,
							move.state.channel.participants,
						],
					)],
				),
				signer
			);
			move.signature = {
				v: move.signature[0], r: move.signature[1], s: move.signature[2]
			};
			return move;
		};


		// 1. make a multisig with A and B

		const multisig = await deployMultisig([signer.address]);

		const helper = getCFHelper(multisig, registry, provider);

		// 2. fund the multisig 1 ETH

		const moneybags = await provider.getSigner(accounts[0]);
		await moneybags.sendTransaction({
			to: multisig.address,
			value: ethers.utils.parseEther("1"),
		});

		// 3. get a reference to a tic tac toe object

		const ttt = new ethers.Contract(
			(await TicTacToe.new()).address,
			TicTacToe.abi,
			signer
		);

		const conditional = new ethers.Contract(
			(await Conditional.new()).address,
			Conditional.abi,
			signer
		);

		// 4. cf startup ops in order:

		// - cf instantiate fmg

		const fmg = await helper.deploy(ForceMoveGame, signer, [
			ttt.address,
			ttt.interface.functions.validTransition.sighash,
			ttt.interface.functions.isFinal.sighash,
		]);

		// - cf instantiate interpreter

		const interpreter = await helper.deploy(TicTacToeInterpreter, signer, [
			ethers.utils.parseEther("1"),
			[A.address, B.address],
		]);

		// 5. cf usage
		// - sign fmg<->tictactoe state updates to play the game

		const moves = {
			0: moveHelper(0, [O_TURN, [
				X,     EMPTY, EMPTY,
				EMPTY, EMPTY, EMPTY,
				EMPTY, EMPTY, EMPTY,
			]], A),
			1: moveHelper(1, [X_TURN, [
				X,     EMPTY, EMPTY,
				O,     EMPTY, EMPTY,
				EMPTY, EMPTY, EMPTY,
			]], B),
			2: moveHelper(2, [O_TURN, [
				X,     X,     EMPTY,
				O,     EMPTY, EMPTY,
				EMPTY, EMPTY, EMPTY,
			]], A),
			3: moveHelper(3, [X_TURN, [
				X,     X,     EMPTY,
				O,     O,     EMPTY,
				EMPTY, EMPTY, EMPTY,
			]], B),
			4: moveHelper(4, [X_WON, [
				X,     X,     X,
				O,     O,     EMPTY,
				EMPTY, EMPTY, EMPTY,
			]], A)
		};

		// 5. dispute
		// - make a forceMove after O goes offline to declare X as the winner

		await helper.proxyCall(fmg, signer, "forceMove", [
			[moves[3], moves[4]]
		]);

		await evm_mine(9);

		assert.equal(
			(await provider.getBalance(A.address)).toString(),
			(ethers.utils.parseEther("0")).toString()
		);

		assert.equal(
			(await provider.getBalance(A.address)).toString(),
			(ethers.utils.parseEther("0")).toString()
		);

		assert.equal(
			(await provider.getBalance(multisig.address)).toString(),
			(ethers.utils.parseEther("1")).toString()
		);

		await helper.delegatecall(
			conditional.address,
			signer,
			conditional.interface.functions.executeManyThenDelegate(
				[{
					dest: {
						registry: registry.address,
						addr: fmg.cfaddress,
					},
					selector: fmg.contract.interface.functions.getState.sighash,
				}, {
					dest: {
						registry: registry.address,
						addr: interpreter.cfaddress,
					},
					selector: interpreter.contract.interface.functions.interpret.sighash,
				}],
				delegateTargets.address,
				delegateTargets.interface.functions.resolveETH.sighash,
			).data
		);

		assert.equal(
			(await provider.getBalance(A.address)).toString(),
			(ethers.utils.parseEther("1")).toString()
		);

		assert.equal(
			(await provider.getBalance(B.address)).toString(),
			(ethers.utils.parseEther("0")).toString()
		);

		assert.equal(
			(await provider.getBalance(multisig.address)).toString(),
			(ethers.utils.parseEther("0")).toString()
		);

	});

});
