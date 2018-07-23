export let Instructions = {
	update: [
		["generateOp", "update"],
		["signMyUpdate"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	],
	setup: [
		["generateOp", "setupNonce"],
		["signMyUpdate"],
		["generateOp", "setupFreeBalance"],
		["signMyUpdate"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	],
	install: [
		["generateKey"],
		["IoSendMessage"],
		["waitForIo"],
		["generateOp", "install"],
		["validateSignatures"],
		["signMyUpdate"],
		["IoSendMessage"],
		["returnSuccess"]
	],
	uninstall: [
		["generateOp", "uninstall"],
		["signMyUpdate"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	]
};

export let AckInstructions = {
	update: [
		["generateOp"],
		["validateSignatures"],
		["signMyUpdate"],
		["IoSendMessage"],
		["returnSuccess"]
	],
	setup: [
		["generateOp", "setupNonce"],
		["validateSignatures"],
		["generateOp", "setupFreeBalance"],
		["validateSignatures"], // @igor we could also  do validate in one step
		["signMyUpdate"],
		["IoSendMessage"],
		["returnSuccess"]
	],
	install: [
		["generateKey"],
		["generateOp", "install"],
		["signMyUpdate"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	],
	uninstall: [
		["generateOp", "uninstall"],
		["validateSignatures"],
		["signMyUpdate"],
		["IoSendMessage"],
		["returnSuccess"]
	]
};
