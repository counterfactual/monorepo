module.exports = function (data) { // TODO: Do we need any other information?
  const allAddresses = Object.keys(this.addressToSockets).filter(connectedAddress => connectedAddress !== data.fromAddress);
  const randomIndex = Math.floor(Math.random() * allAddresses.length);
  const socket = this.addressToSockets[data.fromAddress];

  console.log('Matchmaking completed!', data.fromAddress, ' <3 ', allAddresses[randomIndex]);

  socket.emit('message', {
    type: 'matchedPlayer',
    peerAddress: allAddresses[randomIndex],
    appDefinition: data.appDefinition,
  });
}
