export default {
	input: "dist/examples/ttt/ttt-mod.js",
	output: {
		file: "build/js/ttt-mod.min.js",
		format: "iife",
		sourcemap: true,
		name: "ttt",
	},
};
