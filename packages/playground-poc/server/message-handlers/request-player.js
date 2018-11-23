module.exports = function (data) { // TODO: Do we need any other information?
  const allAddresses = Object.keys(this.addressToSockets).filter(connectedAddress => connectedAddress !== data.fromAddress);
  const randomIndex = Math.floor(Math.random() * allAddresses.length);
  const socket = this.addressToSockets[data.fromAddress];
  const reply = {
    type: 'matchedPlayer',
    peerAddress: allAddresses[randomIndex],
    appDefinition: data.appDefinition,
  };

  console.log('Matchmaking completed!', reply);

  socket.emit('message', reply);
}
