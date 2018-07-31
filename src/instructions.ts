export enum Instruction {
	/**
	 * Returns a CfOperation, giving the ability to create a hash to sign
	 * or construct a transaction to be broadcast on chain.
	 */
	OP_GENERATE = 0,
	/**
	 * Requests a signature on the hash of a previously generated CfOperation.
	 */
	OP_SIGN,
	/**
	 * Ensures a signature is both correclty signed and is representative of a
	 * correctly formed cf operation.
	 */
	OP_SIGN_VALIDATE,
	/**
	 * Prepares a message to be sent out to a peer, transitioning the message
	 * to the next in the cf-protocol sequence.
	 */
	IO_PREPARE_SEND,
	/**
	 * Sends a ClientMessage to a peer.
	 */
	IO_SEND,
	/**
	 * Blocks the action execution until the next message is received by a peer.
	 */
	IO_WAIT,
	/**
	 * Generates a pair of siging keys to be used with an application.
	 */
	KEY_GENERATE,
	/**
	 * Called when a protocol has correctly executed. The state of the VM
	 * should transitioned at this point, finalizing all pending protocol state.
	 */
	SUCCESS,
	/**
	 * Represents all instructions. Registering for this instruction will yield
	 * all messages.
	 */
	ALL
}

/**
 * Instructions executed on the intiating end of a protocol, i.e., a peer who
 * starts a protocol with a peer out of nowhere.
 */
export let Instructions = {
	update: [
		Instruction.OP_GENERATE,
		Instruction.OP_SIGN,
		Instruction.IO_PREPARE_SEND,
		Instruction.IO_SEND,
		Instruction.IO_WAIT,
		Instruction.OP_SIGN_VALIDATE,
		Instruction.SUCCESS
	],
	setup: [
		Instruction.OP_GENERATE,
		Instruction.OP_SIGN,
		Instruction.IO_PREPARE_SEND,
		Instruction.IO_SEND,
		Instruction.IO_WAIT,
		Instruction.OP_SIGN_VALIDATE,
		Instruction.SUCCESS
	],
	install: [
		Instruction.KEY_GENERATE,
		Instruction.IO_PREPARE_SEND,
		Instruction.IO_SEND,
		Instruction.IO_WAIT,
		Instruction.OP_GENERATE,
		Instruction.OP_SIGN_VALIDATE,
		Instruction.OP_SIGN,
		Instruction.IO_PREPARE_SEND,
		Instruction.IO_SEND,
		Instruction.SUCCESS
	],
	uninstall: [
		Instruction.OP_GENERATE,
		Instruction.OP_SIGN,
		Instruction.IO_PREPARE_SEND,
		Instruction.IO_SEND,
		Instruction.IO_WAIT,
		Instruction.OP_SIGN_VALIDATE,
		Instruction.SUCCESS
	]
};

/**
 * Instructions executed on the receiving end of a protocol, i.e., by a peer
 * who did not initiate a given protocol.
 */
export let AckInstructions = {
	update: [
		Instruction.OP_GENERATE,
		Instruction.OP_SIGN_VALIDATE,
		Instruction.OP_SIGN,
		Instruction.IO_PREPARE_SEND,
		Instruction.IO_SEND,
		Instruction.SUCCESS
	],
	setup: [
		Instruction.OP_GENERATE,
		Instruction.OP_SIGN_VALIDATE,
		Instruction.OP_SIGN,
		Instruction.IO_PREPARE_SEND,
		Instruction.IO_SEND,
		Instruction.SUCCESS
	],
	install: [
		Instruction.KEY_GENERATE,
		Instruction.OP_GENERATE,
		Instruction.OP_SIGN,
		Instruction.IO_PREPARE_SEND,
		Instruction.IO_SEND,
		Instruction.IO_WAIT,
		Instruction.OP_SIGN_VALIDATE,
		Instruction.SUCCESS
	],
	uninstall: [
		Instruction.OP_GENERATE,
		Instruction.OP_SIGN_VALIDATE,
		Instruction.OP_SIGN,
		Instruction.IO_PREPARE_SEND,
		Instruction.IO_SEND,
		Instruction.SUCCESS
	]
};
