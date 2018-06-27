pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";

import "./CallLib.sol";


contract ConditionalTransfer is CallLib {

	struct Condition {
		CallLib.Function func;
		bytes parameters;
		bytes expectedValue;
	}

	// TODO: Generalize to AST boolean logic.
	// TODO: Comparing to bytes won't work for _every_ case
	//       We ought to build some kind of Comparison.sol
	//       library for each type; use abi.encode() for
	//       structs and compare bytes.
	function requireAllConditions(Condition[] conditions) public {
		for (uint256 i = 0; i < conditions.length; i++) {
			require(
				CallLib.isEqual(
					conditions[i].func,
					conditions[i].parameters,
					conditions[i].expectedValue
				)
			);
		}
	}

	/// TODO: Simplify... this logic is too confusing and dangerous.
	function makeConditionalTransfer(
		Condition[] conditions,
		CallLib.Function retrieveAppState,
		CallLib.Function[] interpretPipeline,
		CallLib.Function payoutFunction
	)
		public
	{

		requireAllConditions(conditions);

		bytes memory appState = CallLib.apply(retrieveAppState, "");

		bytes memory resolution;

		if (interpretPipeline.length > 0) {
			resolution = compose(interpretPipeline, appState);
		} else {
			resolution = appState;
		}

		require(
			payoutFunction
				.dest
				.lookup()
				.delegatecall(payoutFunction.selector, resolution)
		);
	}

}
