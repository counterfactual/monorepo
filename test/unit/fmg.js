const ethers = require("ethers");

const utils = require("../helpers/utils.js");

const Registry = artifacts.require("Registry");
const ForceMoveGame = artifacts.require("ForceMoveGame");
const SimpleGame = artifacts.require("SimpleGame");
const TicTacToe = artifacts.require("TicTacToe");

const zeroBytes32 = "0x0000000000000000000000000000000000000000000000000000000000000000";

contract("ForceMoveGame", (accounts) => {

	const provider = new ethers.providers.Web3Provider(web3.currentProvider);
	const signer = provider.getSigner();

	let fma;

	const testObjectStorage = {
		owner: accounts[0],
		registry: Registry.address,
		id: 0,
		deltaTimeout: 10,
		// Apparently you cannot ignore args and have them default
		finalizesAt: 0,
		latestNonce: 0,
		wasDeclaredFinal: false,
		dependancy: {
			addr: "0x0",
			nonce: 0,
		}
	};

	beforeEach(async () => {
		const tx = (await signer.sendTransaction({
			gasLimit: 4712388,
			gasPrice: await provider.getGasPrice(),
			...ethers.Contract.getDeployTransaction(
				ForceMoveGame.binary,
				ForceMoveGame.abi,
				testObjectStorage,
			)
		}));
		const addr = ethers.utils.getContractAddress(tx);
		fma = new ethers.Contract(addr, ForceMoveGame.abi, signer);
	});

	it("should have the correct params from constructor", async () => {
		const parameters = await fma.objectStorage();
		assert.equal(accounts[0].toLowerCase(), parameters.owner.toLowerCase());
		assert.equal(Registry.address.toLowerCase(), parameters.registry.toLowerCase());
		assert.equal(0, parameters.id);
		assert.equal(10, parameters.deltaTimeout);
		assert.equal(web3.eth.blockNumber + 10, parameters.finalizesAt);
		assert.equal(0, parameters.latestNonce);
		assert.equal(false, parameters.wasDeclaredFinal);
		assert.equal(zeroBytes32, parameters.dependancy.addr);
		assert.equal(0, parameters.dependancy.nonce);
	});

	describe("SimpleGame", async () => {

		let moveHelper, moreGas, tmpsigner1, tmpsigner2;

		beforeEach(async () => {

			tmpsigner1 = ethers.Wallet.createRandom();
			tmpsigner2 = ethers.Wallet.createRandom();

			moreGas = {
				gasLimit: 4712388,
				gasPrice: await provider.getGasPrice(),
			};

			const sg = await SimpleGame.new();
			const ittt = new ethers.Interface(sg.abi);

			const state = [
				sg.address,
				ittt.functions.validTransition.sighash,
				ittt.functions.isFinal.sighash,
				[]
			];

			await fma.setState(...state, moreGas);

			moveHelper = (turnNum, gameState, signer) => {
				const move = {
					state: {
						turnNum,
						channel: {
							gameType: sg.address,
							participants: [tmpsigner1.address, tmpsigner2.address],
						},
						gameState: ethers.utils.AbiCoder.defaultCoder.encode(
							["tuple(uint256,uint256)"],
							[gameState]
						),
						resolutionTransform: zeroBytes32,
					}
				};
				move.signature = utils.signMessage(
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
		});

		describe("forceMove", async () => {
			it("should allow force move", async () => {
				const move1 = moveHelper(0, [0, 1336], tmpsigner1);
				const move2 = moveHelper(1, [1, 1337], tmpsigner2);
				await fma.forceMove([move1, move2], moreGas);
				const challenge = await fma.challenge();
				assert.equal(challenge.exists, true);
				assert.equal(challenge.challengeState.gameState, move2.state.gameState);
			});

			it("should disallow force on invalid transitions", async () => {
				// 9999 < 23 == false
				const move1 = moveHelper(0, [0, 1337], tmpsigner1);
				const move2 = moveHelper(1, [1, 1336], tmpsigner2);
				await utils.assertRejects(fma.forceMove([move1, move2], moreGas));
			});

			it("should disallow force on invalid signers", async () => {
				// turnNum 0 is for tmpSigner1 not 2
				const move1 = moveHelper(0, [0, 1336], tmpsigner2);
				const move2 = moveHelper(1, [1, 1337], tmpsigner1);
				await utils.assertRejects(fma.forceMove([move1, move2], moreGas));
			});
		});

		describe("refute", async () => {
			it("should allow refuting a move", async () => {
				const move1 = moveHelper(0, [0, 1336], tmpsigner1);
				const move2a = moveHelper(1, [1, 1337], tmpsigner2);

				await fma.forceMove([move1, move2a], moreGas);

				const move2b = moveHelper(1, [1, 1338], tmpsigner2);

				let challenge = await fma.challenge();

				assert.equal(challenge.exists, true);
				assert.equal(challenge.challengeState.gameState, move2a.state.gameState);

				await fma.refute(move2b, moreGas);

				challenge = await fma.challenge();

				assert.equal(challenge.exists, false);
				assert.equal(challenge.challengeState.gameState, "0x");
			});
		});

		describe("respondWithMove", async () => {
			it("should allow responses with a move", async () => {
				const move1 = moveHelper(0, [0, 1336], tmpsigner1);
				const move2 = moveHelper(1, [1, 1337], tmpsigner2);

				await fma.forceMove([move1, move2], moreGas);

				const move3 = moveHelper(2, [1, 1338], tmpsigner1);

				await fma.respondWithMove(move3, moreGas);

				const challenge = await fma.challenge();

				assert.equal(challenge.exists, false);
				assert.equal(challenge.challengeState.gameState, "0x");
			});
		});

		describe("alternativeRespondWithMove", async () => {
			it("should allow responses with alternative moves", async () => {
				const move1 = moveHelper(0, [0, 1335], tmpsigner1);
				const move2 = moveHelper(1, [0, 1336], tmpsigner2);

				await fma.forceMove([move1, move2], moreGas);

				const move3 = moveHelper(2, [0, 1337], tmpsigner1);

				await fma.alternativeRespondWithMove([move2, move3], moreGas);

				const challenge = await fma.challenge();

				assert.equal(challenge.exists, false);
				assert.equal(challenge.challengeState.gameState, "0x");
			});
		});

		describe("conclude", async () => {
			it("should allow a party to conclude with a valid sequence of end moves", async () => {
				const move1 = moveHelper(0, [1, 1337], tmpsigner1);
				const move2 = moveHelper(1, [1, 1339], tmpsigner2);

				await fma.conclude([move1, move2], moreGas);

				const challenge = await fma.challenge();

				assert.equal(challenge.exists, false);
				assert.equal(challenge.challengeState.gameState, move1.state.gameState);
			});
		});

	});

	describe("TicTacToe", async () => {

		let moveHelper, moreGas, tmpsigner1, tmpsigner2;

		const [X_TURN, O_TURN, X_WON, O_WON] = [0, 1, 2, 3]; // eslint-disable-line no-unused-vars
		const [X, O, EMPTY] = [0, 1, 2];

		beforeEach(async () => {

			tmpsigner1 = ethers.Wallet.createRandom();
			tmpsigner2 = ethers.Wallet.createRandom();

			moreGas = {
				gasLimit: 4712388,
				gasPrice: await provider.getGasPrice(),
			};

			const ttt = await TicTacToe.new();
			const ittt = new ethers.Interface(ttt.abi);

			const state = [
				ttt.address,
				ittt.functions.validTransition.sighash,
				ittt.functions.isFinal.sighash,
				[]
			];

			await fma.setState(...state, moreGas);

			moveHelper = (turnNum, gameState, signer) => {
				const move = {
					state: {
						turnNum,
						channel: {
							gameType: ttt.address,
							participants: [tmpsigner1.address, tmpsigner2.address],
						},
						gameState: ethers.utils.AbiCoder.defaultCoder.encode(
							["tuple(uint256,uint256[9])"],
							[gameState]
						),
						resolutionTransform: zeroBytes32,
					}
				};
				move.signature = utils.signMessage(
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
		});

		describe("forceMove", async () => {
			it("should allow force move", async () => {
				const old = [
					X,     O,     EMPTY,
					X,     EMPTY, EMPTY,
					EMPTY, EMPTY, EMPTY,
				];
				const next = [
					X,     O,     EMPTY,
					X,     O,     EMPTY,
					EMPTY, EMPTY, EMPTY,
				];
				const move1 = moveHelper(0, [O_TURN, old], tmpsigner1);
				const move2 = moveHelper(1, [X_TURN, next], tmpsigner2);
				await fma.forceMove([move1, move2], moreGas);
				const challenge = await fma.challenge();
				assert.equal(challenge.exists, true);
				assert.equal(challenge.challengeState.gameState, move2.state.gameState);
			});
		});
	});

	// it("should be able to set a counterfactual object and balance", async () => {

	//     await fma.functions.setState(...testUpdate, {
	//         gasLimit: 4712388,
	//         gasPrice: await provider.getGasPrice(),
	//     })

	//     assert.equal(await fma.lockedKeys(0), unusedBytes32)
	//     assert.equal(await fma.unlockedKeys(0), unusedAddr)
	// 	   assert.equal(ethers.utils.formatUnits(await fma.locked(unusedBytes32)), '1.0')
	//     assert.equal(ethers.utils.formatUnits(await fma.unlocked(unusedAddr)), '1.5')

	// })

	// it("should reject state updates sent from non-owners", async () => {
	//     await utils.assertRejects(
	//         fma
	//             .connect(provider.getSigner(accounts[1]))
	//             .functions
	//             .setState([], [], 2)
	//     )
	// })

	// it("should be finalizable by its owner", async () => {
	//     const ref = fma.connect(provider.getSigner(accounts[1]))
	//     await utils.assertRejects(ref.finalize())
	//     assert.equal(false, await fma.functions.isFinal())
	//     await fma.finalize()
	//     assert.equal(true, await fma.functions.isFinal())
	// })

	// it("should eventually be considered final", async () => {
	//     assert.equal(false, await fma.functions.isFinal())
	//     await utils.evm_mine(10)
	//     assert.equal(true, await fma.functions.isFinal())
	// })


});
