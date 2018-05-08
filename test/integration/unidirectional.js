const ethers = require("ethers");

const {
	signMessage,
	unusedAddr,
	assertRejects,
} = require("../helpers/utils.js");

const {
	getCFDeployer,
	deployMultisig,
} = require("../helpers/cfhelpers.js");

const Registry = artifacts.require("Registry");
const UnidirectionalETHBalance = artifacts.require("UnidirectionalETHBalance");

contract("UnidirectionalETHBalance", (accounts) => {

	let registry, signer;

	const provider = new ethers.providers.Web3Provider(web3.currentProvider);

	beforeEach(async () => {
		registry = await Registry.new(unusedAddr);
		signer = ethers.Wallet.createRandom();
		signer.provider = provider;
	});

	it("Can instantly send money to the recipient", async () => {

		const multisig = await deployMultisig([signer.address]);

		const deployer = getCFDeployer(multisig, registry, provider);

		const cargs = [signer.address, signer.address, ethers.utils.parseEther("1")];

		const unidirectional = await deployer.deploy(UnidirectionalETHBalance, signer, cargs);

		const sig = signMessage(
			ethers.utils.solidityKeccak256(
				["bytes1", "address", "uint256"],
				["0x19", multisig.address, ethers.utils.parseEther("0.5")],
			),
			signer
		);

		await unidirectional.contract.connect(await provider.getSigner()).setAmount(
			{v: sig[0], r: sig[1], s: sig[2]},
			{v: sig[0], r: sig[1], s: sig[2]},
			ethers.utils.parseEther("0.5")
		);

		assert.equal(
			(await unidirectional.contract.decidedAmount()).toString(),
			(ethers.utils.parseEther("0.5")).toString(),
		);

		assert.equal(
			(await unidirectional.contract.maxAmount()).toString(),
			(ethers.utils.parseEther("1.0")).toString(),
		);

		const moneybags = await provider.getSigner(accounts[0]);
		await moneybags.sendTransaction({
			to: multisig.address,
			value: ethers.utils.parseEther("2.5"),
		});

		await deployer.delegatecall(unidirectional, signer, "claimAmount", [
			registry.address, unidirectional.cfaddress
		]);

		assert.equal(
			(await provider.getBalance(multisig.address)).toString(),
			(ethers.utils.parseEther("2.0")).toString()
		);

		assert.equal(
			(await provider.getBalance(signer.address)).toString(),
			(ethers.utils.parseEther("0.5")).toString()
		);

		await assertRejects(
			unidirectional.contract.connect(await provider.getSigner()).setAmount(
				{v: sig[0], r: sig[1], s: sig[2]},
				{v: sig[0], r: sig[1], s: sig[2]},
				ethers.utils.parseEther("0.5")
			)
		);

	});


});
