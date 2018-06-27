pragma solidity ^0.4.24;
pragma experimental "ABIEncoderV2";

import "./AssetLib.sol";
import "../lib/IERC20Token.sol";
import "../registry/RegistryAddressLib.sol";


contract AssetDispatcher {

	using AssetLib for AssetLib.ETHTransfer;
	using AssetLib for AssetLib.ERC20Transfer;
	using RegistryAddressLib for RegistryAddressLib.CFAddress;

	function transferETH(AssetLib.ETHTransfer[] memory balances) public {
		for (uint256 i = 0; i < balances.length; i++) {
			address to = balances[i].to.lookup();
			uint256 amount = balances[i].amount;
			if (to != address(this) && amount > 0) {
				// FIXME: `call` is less secure (re-rentrancy attack) but we need it
				//        for metachannel proxies unfortunately.
				assembly {
					pop(call(not(0), to, amount, 0, 0, 0, 0))
				}
			}
		}
	}

	function transferERC20(AssetLib.ERC20Transfer[] memory balances) public {
		for (uint256 i = 0; i < balances.length; i++) {
			require(
				IERC20Token(balances[i].token).transfer(
					balances[i].to.lookup(),
					balances[i].amount
				)
			);
		}
	}

}
