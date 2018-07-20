pragma solidity 0.4.24;
pragma experimental "ABIEncoderV2";


library Disputable {

  enum Status {
    OK,
    DISPUTE,
    SETTLED
  }

  struct Meta {
    Status status;
    address latestSubmitter;
    uint256 nonce;
    uint256 disputeNonce;
    uint256 finalizesAt;
    uint256 disputeCounter;
    uint256 timeoutPeriod;
  }

  struct State {
    bytes32 proof;
    Meta meta;
  }

  function createFromStateHash(bytes32 proof, uint256 timeout)
    pure
    public
    returns (State state)
  {
    state.proof = proof;
    state.meta.timeoutPeriod = timeout;
  }

  function set(
    State storage self,
    bytes32 proof,
    uint256 nonce,
    uint256 timeout
  )
    public
  {
    require(nonce > self.meta.nonce);
    self.proof = proof;
    self.meta.nonce = nonce;
    self.meta.disputeNonce = 0;
    self.meta.finalizesAt = block.number + timeout;
    self.meta.disputeCounter += 1;
    self.meta.status = Status.DISPUTE;
    self.meta.latestSubmitter = msg.sender;
  }

  function update(State storage self, bytes proof, uint256 timeout) public {
    require(!settled(self), "State already settled.");
    self.proof = keccak256(proof);
    self.meta.disputeNonce += 1;
    self.meta.finalizesAt = block.number + timeout;
    self.meta.disputeCounter += 1;
    self.meta.status = Status.DISPUTE;
    self.meta.latestSubmitter = msg.sender;
  }

  function finalize(State storage self, bytes proof) public {
    self.proof = keccak256(proof);
    finalize(self);
  }

  function finalize(State storage self) public {
    self.meta.finalizesAt = block.number;
    self.meta.status = Status.SETTLED;
  }

  function resolve(State storage self) public {
    self.meta.finalizesAt = 0;
    self.meta.status = Status.OK;
  }

  function settled(State storage self) public view returns (bool) {
    if (self.meta.status == Status.OK) {
      return false;
    } else if (self.meta.status == Status.DISPUTE) {
      return block.number >= self.meta.finalizesAt;
    } else if (self.meta.status == Status.SETTLED) {
      return true;
    }
  }

}

