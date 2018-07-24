export let Instructions = {
	update: [
		["generateOp", "update"],
		["signMyUpdate"],
		["prepareNextMsg"],
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
		["prepareNextMsg"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	],
	install: [
		["generateKey"],
		["prepareNextMsg"],
		["IoSendMessage"],
		["waitForIo"],
		["generateOp", "install"],
		["validateSignatures"],
		["signMyUpdate"],
		["prepareNextMsg"],
		["IoSendMessage"],
		["returnSuccess"]
	],
	uninstall: [
		["generateOp", "uninstall"],
		["signMyUpdate"],
		["prepareNextMsg"],
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
		["prepareNextMsg"],
		["IoSendMessage"],
		["returnSuccess"]
	],
	setup: [
		["generateOp", "setupNonce"],
		["validateSignatures"],
		["generateOp", "setupFreeBalance"],
		["validateSignatures"], // @igor we could also  do validate in one step
		["signMyUpdate"],
		["prepareNextMsg"],
		["IoSendMessage"],
		["returnSuccess"]
	],
	install: [
		["generateKey"],
		["generateOp", "install"],
		["signMyUpdate"],
		["prepareNextMsg"],
		["IoSendMessage"],
		["waitForIo"],
		["validateSignatures"],
		["returnSuccess"]
	],
	uninstall: [
		["generateOp", "uninstall"],
		["validateSignatures"],
		["signMyUpdate"],
		["prepareNextMsg"],
		["IoSendMessage"],
		["returnSuccess"]
	]
};
