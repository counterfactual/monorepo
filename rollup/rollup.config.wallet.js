export default {
	input: "dist/test/wallet/wallet.js",
	output: {
		file: "build/js/wallet.min.js",
		format: "iife",
		sourcemap: true,
		name: "wa",
  }
};
