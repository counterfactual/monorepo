pragma solidity 0.4.24;


contract IERC20Token {

	function transfer(address _to, uint256 _value)
		public
		returns (bool);

	function transferFrom(address _from, address _to, uint256 _value)
		public
		returns (bool);

	function approve(address _spender, uint256 _value)
		public
		returns (bool);

	function balanceOf(address _owner)
		public view
		returns (uint256);

	function allowance(address _owner, address _spender)
		public view
		returns (uint256);

	event Transfer(
		address indexed _from,
		address indexed _to,
		uint256 _value
	);

	event Approval(
		address indexed _owner,
		address indexed _spender,
		uint256 _value
	);
}
