const ethers = require("ethers");
const cfHelpers = require("../helpers/cfhelpers.js");
const gnosisSafeUtils = require("../helpers/gnosis_safe.js");
const utils = require("../helpers/utils.js");

const ETHBalance = artifacts.require("ETHBalance");
const ETHConditionalTransfer = artifacts.require("ETHConditionalTransfer");
const GnosisSafe = artifacts.require("GnosisSafe");
const MockRegistry = artifacts.require("MockRegistry");

/**
 * Tests the ETHBalance contract can act as a metachannel deposit.
 */
contract("ETHBalance", (accounts) => {

	const provider = new ethers.providers.Web3Provider(web3.currentProvider);
	const signer = provider.getSigner();

	/**
	 * Tests the execution of a withdraw transaction, making a delegate call
	 * from a MultiSig to the ETHBalance object.
	 *
	 * Expects the sender's deposit to be drained from the multisig and sent
	 * to it's resolved counterfactual address representing, e.g., a multisig
	 * for a metachannel. The intermediary's deposit should be returned
	 * directly to its address.
	 */
	it("refunds the sender and intermediary to cf and regular addresses", async() => {
		let registry = new ethers.Contract(
			(await MockRegistry.deployed()).address,
			MockRegistry.abi,
			signer,
		);
		let participants = setupParticipants();
		let multiSig = await setupMultiSig(participants, "1.5");
		let metaChanMultiSig = await setupMetaChanMultiSig(registry);
		let conditionalTransfer = await setupConditionalTransfer(registry, multiSig);
		let metaChanDeposit = await setupMetaChanDeposit(
			registry,
			multiSig,
			metaChanMultiSig.cfAddr,
			participants,
			conditionalTransfer.cfAddr,
		);

		await setStateConditionalTransfer(
			conditionalTransfer,
			metaChanDeposit,
			metaChanMultiSig,
			participants,
			registry,
			multiSig
		);

		await assertBalances(
			[multiSig.address, metaChanMultiSig.contract.address, participants.intermediaryAddr],
			[1.5, 0, 0]
		);
		await executeWithdrawal(
			metaChanDeposit,
			conditionalTransfer,
			registry,
			multiSig,
			participants.wallets
		);
		await assertBalances(
			[multiSig.address, metaChanMultiSig.contract.address, participants.intermediaryAddr],
			[0.5, 0.3, 0.7]
		);
	});

	/**
	 * @returns an object representing the owners of the multisig issuing txs.
	 */
	function setupParticipants() {
		let wallets = [
			new ethers.Wallet("0x1df0d686810fc9273707f3acf6641e860ecfa99255bb967b7a5116f176871d6f"),
			new ethers.Wallet("0x846d7426e7a54654d708c24d47e3e94720ee9982ec37ed6dd09b713d609d5127")
		];

		return {
			wallets: wallets,
			senderAddr: wallets[0].address,
			intermediaryAddr: wallets[1].address
		};
	}

	/**
	 *  @returns the main multisig owning the tests counterfactual objects.
	 */
	async function setupMultiSig(participants, amount) {
		let safe = await GnosisSafe.new(
			[participants.senderAddr, participants.intermediaryAddr],
			2,
			0,
			0
		);
		await utils.sendEth(safe.address, amount, signer, provider);
		return safe;
	}

	async function setupConditionalTransfer(registry, multiSig) {
		let objStorage = {
			owner: multiSig.address,
			registry: registry.address,
			wasDeclaredFinal: false,
			finalizesAt: 0,
			id: 0,
			latestNonce: 0,
			deltaTimeout: 10,
			dependancy: {
				addr: "0x0",
				nonce: 0,
			}
		};
		const contract = await utils.deployContract(
			ETHConditionalTransfer,
			[objStorage],
			signer,
			provider
		);
		const cfAddr = "0x00000000000000000000000000000000000000000000000000000000000000ab";
		await registry.setLookup(cfAddr, contract.address);
		return { cfAddr, contract };
	}

	/**
	 * @returns a contract representing the counterfactual multi-sig that can
	 *          be used in a metachannel. (Note: the contract is just a mock
	 *          since the only functionality we need of the multisig is the
	 *          ability to receive balances.)
	 */
	async function setupMetaChanMultiSig(registry) {
		let contract = await MockRegistry.new();
		let cfAddr = "0x0000000000000000000000000000000000000000000000000000000000000000";
		await registry.setLookup(cfAddr, contract.address);
		return {
			contract: contract,
			cfAddr: cfAddr
		};
	}

	/**
	 * @returns a meta channel deposit in the form of an ETHBalance contract,
	 *          where the contract has set balances and is in a final state.
	 */
	async function setupMetaChanDeposit(
		registry,
		multiSig,
		senderCFAddr,
		participants,
		callback,
	) {
		let balances = [{
			cfAddr: {addr: utils.zeroAddress, registry: registry.address},
			balance: ethers.utils.parseEther("0.3")
		}, {
			cfAddr: {addr: participants.intermediaryAddr, registry: utils.zeroAddress},
			balance: ethers.utils.parseEther("0.7")
		}];

		let contract = await deployMetaChannelDeposit(
			multiSig.address,
			registry
		);
		let nonce = 1;

		// set registry
		let metaChannelDepositCFAddr = "0x0000000000000000000000000000000000000000000000000000000000000001";
		await registry.setLookup(metaChannelDepositCFAddr, contract.address);

		// assign the balance state to the ETHBalance object
		await executeSetState(
			contract,
			balances,
			nonce,
			registry,
			metaChannelDepositCFAddr,
			multiSig,
			participants,
			callback,
		);

		// so that we can withdraw
		await executeFinalize(
			contract,
			balances,
			nonce,
			registry,
			metaChannelDepositCFAddr,
			multiSig,
			participants
		);

		return {
			contract: contract,
			cfAddr: metaChannelDepositCFAddr
		};
	}

	async function setStateConditionalTransfer(
		conditionalTransfer,
		metaChanDeposit,
		metaChanMultiSig,
		participants,
		registry,
		multiSig
	) {
		let conditionalTransferData = conditionalTransfer
			.contract
			.interface
			.functions
			.setState(
				ethers.utils.parseEther("1"),
				metaChanDeposit.cfAddr,
				[metaChanDeposit.cfAddr],
				[metaChanMultiSig.contract.address, participants.intermediaryAddr],
				[ethers.utils.parseEther("0.5"), ethers.utils.parseEther("0.5")]
			)
			.data;

		await cfHelpers.executeProxyCall(
			conditionalTransferData,
			registry,
			conditionalTransfer.cfAddr,
			multiSig,
			participants.wallets
		);
	}

	/**
	 * Executes a setState transaction on the given ethBalance contract
	 * with the given arguments (balances, nonce).
	 */
	async function executeSetState(
		ethBalance,
		balances,
		nonce,
		registry,
		metaChannelDepositCFAddr,
		multiSig,
		participants,
		callback
	) {
		let metaChanDepositData = ethBalance
			.interface
			.functions
			.setState(balances, callback, nonce)
			.data;

		await cfHelpers.executeProxyCall(
			metaChanDepositData,
			registry,
			metaChannelDepositCFAddr,
			multiSig,
			participants.wallets
		);
	}

	/**
	 * Executes a transaction to put the given ETHBalance contract into a
	 * final state.
	 */
	async function executeFinalize(
		ethBalance,
		balances,
		nonce,
		registry,
		metaChannelDepositCFAddr,
		multiSig,
		participants
	) {
		let metaChanDepositData = ethBalance
			.interface
			.functions
			.finalize()
			.data;

		await cfHelpers.executeProxyCall(
			metaChanDepositData,
			registry,
			metaChannelDepositCFAddr,
			multiSig,
			participants.wallets
		);
	}

	/**
	 * Deploys a ETHBalance object, setting the given multisigAddr as
	 * the owner, and so all updates to the ETHBalnace object must come
	 * from the multisig.
	 */
	async function deployMetaChannelDeposit(
		multisigAddr,
		registry,
	) {
		let objStorage = {
			owner: multisigAddr,
			registry: registry.address,
			wasDeclaredFinal: false,
			finalizesAt: 0,
			id: 0,
			latestNonce: 0,
			deltaTimeout: 10,
			dependancy: {
				addr: "0x0",
				nonce: 0,
			}
		};

		let args = [objStorage];
		return contract = await utils.deployContract(
			ETHBalance,
			args,
			signer,
			provider
		);
	}

	/**
	 * Withdraws funds from the given multisig and sends them to their
	 * corresponding ETHBalance contract, resolving counterfactual addresses
	 * to on chain addresses, if needed.
	 */
	async function executeWithdrawal(
		metaChannelDeposit,
		conditionalTransfer,
		registry,
		multiSig,
		wallets
	) {
		let data = metaChannelDeposit
			.contract
			.interface
			.functions
			.resolve()
			.data;

		await gnosisSafeUtils.executeTxData(
			data,
			metaChannelDeposit.contract.address,
			multiSig,
			wallets,
			gnosisSafeUtils.Operation.Call
		);

		data = conditionalTransfer
			.contract
			.interface
			.functions
			.resolve(
				registry.address,
				conditionalTransfer.cfAddr,
			)
			.data;

		await gnosisSafeUtils.executeTxData(
			data,
			conditionalTransfer.contract.address,
			multiSig,
			wallets,
			gnosisSafeUtils.Operation.Delegatecall
		);

	}

	async function assertBalances(addresses, balances) {
		for (let i = 0; i < addresses.length; i += 1) {
			let result = await utils.getEthBalance(addresses[i], provider);
			assert.equal(result, balances[i]);
		}
	}
});
