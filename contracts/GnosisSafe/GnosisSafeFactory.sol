pragma solidity 0.4.19;
import "./GnosisSafe.sol";


contract GnosisSafeFactory {

    event GnosisSafeCreation(address creator, GnosisSafe gnosisSafe);

    function create(
    	address[] owners,
    	uint8 _threshold,
    	address to,
    	bytes data
    )
        public
        returns (GnosisSafe gnosisSafe)
    {
        gnosisSafe = new GnosisSafe(owners, _threshold, to, data);
        GnosisSafeCreation(msg.sender, gnosisSafe);
    }
}
