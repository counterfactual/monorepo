// NO SOCKETS HERE!
(async () => {
  const nodeProvider = new NodeProvider();
  await nodeProvider.connect();

  const client = new cf.Client(nodeProvider);

  // client.on('proposeInstall', (data) => {
    // console.log('proposeInstall');
  // });
  // client.on('install', function () {});
  // client.on('rejectInstall', function (data) {
    // nodeProvider.emit('rejectedInstall', { peerAddress: data.fromAddress });
  // });
  client.once('install', () => {
    document.getElementById('send-message').style.display = 'none';
    document.write('<h1>Installed High Roller!</h1>');
  });

  const manifest = {
    // AppDefinition goes here...
    // TODO: Where does this info go? How deep in the communication flow they travel?
    // TODO: Should add all the manifest properties. How to load the manifest? Build process?
    name: 'High Roller',
    version: '0.0.1',
    url: 'dapps/high-roller.html',
    address: '0x822c045f6F5e7E8090eA820E24A5f327C4E62c96'
  };

  const appFactory = client.createAppFactory(manifest);

  // Wallet broadcasts through the Node, tells the world
  // "HEY! someone's installing something", via Firebase.
  // It should fall under Hub's responsability.

  // When we send proposeInstall, we talk to the Hub.
  // The Hub will route the message for us.

  var ui = {
    sendMessage: document.getElementById('send-message')
  };

  ui.sendMessage.addEventListener('click', function () {
    debugger;
    nodeProvider.emit('requestPlayer', { appDefinition: manifest });
    nodeProvider.once('matchedPlayer', (data) => {
      appFactory.proposeInstall(data.peerAddress, {
        // Terms goes here...
      });
    });
  });
})();
