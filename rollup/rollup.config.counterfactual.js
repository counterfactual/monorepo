export default {
	input: "dist/src/counterfactual.js",
	output: {
		file: "build/js/counterfactual.min.js",
		format: "iife",
		sourcemap: true,
		name: "cf",
  }
};
