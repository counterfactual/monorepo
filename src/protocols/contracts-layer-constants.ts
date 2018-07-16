export const Proxy = {
	address: "0x9e5c9691ad19e3b8c48cb9b531465ffa73ee8dd4",
	bytecode:
		"0x608060405234801561001057600080fd5b506040516020806102148339810180604052810190808051906020019092919050505060008173ffffffffffffffffffffffffffffffffffffffff161415151561005957600080fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505061016b806100a96000396000f30060806040526004361061004c576000357c0100000000000000000000000000000000000000000000000000000000900463ffffffff1680634555d5c91461008b5780635c60da1b146100b6575b73ffffffffffffffffffffffffffffffffffffffff600054163660008037600080366000845af43d6000803e6000811415610086573d6000fd5b3d6000f35b34801561009757600080fd5b506100a061010d565b6040518082815260200191505060405180910390f35b3480156100c257600080fd5b506100cb610116565b604051808273ffffffffffffffffffffffffffffffffffffffff1673ffffffffffffffffffffffffffffffffffffffff16815260200191505060405180910390f35b60006002905090565b60008060009054906101000a900473ffffffffffffffffffffffffffffffffffffffff169050905600a165627a7a723058201b945a167fe52e0ee5d77153f752b741d36727fe64abf2e741ecf07a2e80587b0029",
	abi: [
		{
			inputs: [
				{
					name: "_masterCopy",
					type: "address"
				}
			],
			payable: false,
			stateMutability: "nonpayable",
			type: "constructor"
		},
		{
			payable: true,
			stateMutability: "payable",
			type: "fallback"
		},
		{
			constant: true,
			inputs: [],
			name: "implementation",
			outputs: [
				{
					name: "",
					type: "address"
				}
			],
			payable: false,
			stateMutability: "view",
			type: "function"
		},
		{
			constant: true,
			inputs: [],
			name: "proxyType",
			outputs: [
				{
					name: "",
					type: "uint256"
				}
			],
			payable: false,
			stateMutability: "pure",
			type: "function"
		}
	]
};

export const zeroAddress = "0x0000000000000000000000000000000000000000";
