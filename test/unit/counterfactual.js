const ethers = require("ethers");

const {
	zeroBytes32,
	assertRejects,
	signMessageVRS,
	mineBlocks
} = require("../helpers/utils.js");

const { deployApp } = require("../helpers/cfhelpers.js");

const Registry = artifacts.require("Registry");

const UNIQUE_ID = 999999;

contract("CounterfactualApp", accounts => {
	const provider = new ethers.providers.Web3Provider(web3.currentProvider);

	// 0x8F286b71aB220078df4B41Bc29437F6f39cf5e0e
	const signer = new ethers.Wallet(
		"0x5ab8c0e8aad7ba98efc87d45346eb2be32363ee920e6a6ee9e6afe4041ee952e"
	);

	let app;

	beforeEach(async () => {
		const contract = await deployApp(
			accounts[0], // owner
			[signer.address], // signingKeys
			Registry.address, // registry
			UNIQUE_ID, // unique id
			10 // timeout block numbers
		);
		app = new ethers.Contract(
			contract.address,
			contract.abi,
			provider.getSigner()
		);
	});

	it("should be able to retrieve the latest nonce", async () => {
		assert.equal(await app.latestNonce(), 0);
	});

	it("should compute finalize hash correctly", async () => {
		assert.equal(
			await app.getFinalizeHash(UNIQUE_ID, zeroBytes32),
			ethers.utils.solidityKeccak256(
				["bytes1", "uint256", "bytes", "string"],
				["0x19", UNIQUE_ID, zeroBytes32, "finalize"]
			)
		);
	});

	it("should compute update hash correctly", async () => {
		assert.equal(
			await app.getUpdateHash(UNIQUE_ID, zeroBytes32, 1),
			ethers.utils.solidityKeccak256(
				["bytes1", "uint256", "bytes", "uint256"],
				["0x19", UNIQUE_ID, zeroBytes32, 1]
			)
		);
	});

	describe("updating app state", async () => {
		describe("with owner", async () => {
			it("should work with higher nonce", async () => {
				assert.equal(await app.latestNonce(), 0);
				await app.setStateAsOwner(zeroBytes32, 1);
				assert.equal(await app.latestNonce(), 1);
			});

			it("should work with much higher nonce", async () => {
				assert.equal(await app.latestNonce(), 0);
				await app.setStateAsOwner(zeroBytes32, 1000);
				assert.equal(await app.latestNonce(), 1000);
			});

			it("shouldn't work with an equal nonce", async () => {
				await assertRejects(app.setStateAsOwner(zeroBytes32, 0));
				assert.equal(await app.latestNonce(), 0);
			});

			it("shouldn't work with an lower nonce", async () => {
				await app.setStateAsOwner(zeroBytes32, 1);
				await assertRejects(app.setStateAsOwner(zeroBytes32, 0));
				assert.equal(await app.latestNonce(), 1);
			});

			it("should work with nontrivial state", async () => {
				assert.equal(await app.latestNonce(), 0);
				await app.setStateAsOwner(
					ethers.utils.AbiCoder.defaultCoder.encode(
						["uint256", "address"],
						[5, "0x409Ba3dd291bb5D48D5B4404F5EFa207441F6CbA"]
					),
					1,
					{
						gasLimit: 4712388,
						gasPrice: await provider.getGasPrice()
					}
				);
				assert.equal(await app.latestNonce(), 1);
			});
		});

		describe("with signing keys", async () => {
			it("should work with higher nonce", async () => {
				const signature = signMessageVRS(
					await app.getUpdateHash(UNIQUE_ID, zeroBytes32, 1),
					[signer]
				);
				assert.equal(await app.latestNonce(), 0);
				await app.setStateWithSigningKeys(zeroBytes32, 1, signature);
				assert.equal(await app.latestNonce(), 1);
			});

			it("should work with much higher nonce", async () => {
				const signature = signMessageVRS(
					await app.getUpdateHash(UNIQUE_ID, zeroBytes32, 1000),
					[signer]
				);
				assert.equal(await app.latestNonce(), 0);
				await app.setStateWithSigningKeys(zeroBytes32, 1000, signature);
				assert.equal(await app.latestNonce(), 1000);
			});

			it("shouldn't work with an equal nonce", async () => {
				const signature = signMessageVRS(
					await app.getUpdateHash(UNIQUE_ID, zeroBytes32, 0),
					[signer]
				);
				await assertRejects(
					app.setStateWithSigningKeys(zeroBytes32, 0, signature)
				);
				assert.equal(await app.latestNonce(), 0);
			});

			it("shouldn't work with an lower nonce", async () => {
				const signature = signMessageVRS(
					await app.getUpdateHash(UNIQUE_ID, zeroBytes32, 0),
					[signer]
				);
				await app.setStateAsOwner(zeroBytes32, 1);
				await assertRejects(
					app.setStateWithSigningKeys(zeroBytes32, 0, signature)
				);
				assert.equal(await app.latestNonce(), 1);
			});
		});
	});

	describe("finalizing app state", async () => {
		it("should work with owner", async () => {
			assert.equal(await app.isFinal(), false);
			await app.finalizeAsOwner();
			assert.equal(await app.isFinal(), true);
		});

		it("should work with keys", async () => {
			const signature = signMessageVRS(
				await app.getFinalizeHash(UNIQUE_ID, zeroBytes32),
				[signer]
			);
			assert.equal(await app.isFinal(), false);
			await app.finalizeWithSigningKeys(signature);
			assert.equal(await app.isFinal(), true);
		});
	});

	describe("waiting for timeout", async () => {
		it("should block updates after the timeout", async () => {
			await mineBlocks(10);
			assert.equal(await app.isFinal(), true);
			await assertRejects(app.setStateAsOwner(zeroBytes32, 1));
		});
	});
});
