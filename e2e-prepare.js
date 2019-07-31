const shell = require("shelljs");
const silent = false;

shell.echo("(1/7) Running preflight checks and cleanups...");

if (!process.env.PYTHON) {
  console.error(
    "[ERR] Please set the PYTHON environment variable to a path pointing to Python 2.7 (ie: '/usr/bin/python2.7')."
  );
  process.exit(1);
} else {
  console.info("[OK!] Found Python at ", process.env.PYTHON);
}

if (!shell.find("~/.nvm/nvm.sh")) {
  console.error("[ERR] Please install `nvm` in order to use this script.");
  process.exit(1);
} else {
  console.info("[OK!] Found NVM");
}

shell.exec("unlink packages/greenboard/extension", { silent });
shell.exec("rm -rf /tmp/metamask-extension", { silent });

shell.echo("(2/7) Cloning metamask into /tmp/metamask-extension...");
shell.exec(
  "git clone --depth 1 --single-branch --branch joel/for-wallet-ui git@github.com:prototypal/metamask-extension /tmp/metamask-extension",
  { silent }
);

shell.echo("(3/7) Ensuring installed dependencies...");
shell.exec("yarn", { silent });

shell.echo("(4/7) Building Counterfactual...");
shell.exec("yarn build", { silent });

shell.echo("(5/7) Injecting Counterfactual IIFEs into Metamask vendors...");
shell.exec(
  "cp packages/cf.js/dist/index-iife.js /tmp/metamask-extension/app/vendor/counterfactual/node/cf.js.iife.js"
);
shell.exec(
  "cp packages/firebase-client/dist/index.iife.js /tmp/metamask-extension/app/vendor/counterfactual/node/firebase-client.iife.js"
);
shell.exec(
  "cp packages/node/dist/index.iife.js /tmp/metamask-extension/app/vendor/counterfactual/node/node.iife.js"
);

shell.cd("/tmp/metamask-extension");

shell.echo("(6/7) Installing Metamask dependencies...");
shell.exec(". ~/.nvm/nvm.sh && nvm use && npm ci && npx gulp build", {
  silent
});

shell.cd(__dirname);

shell.echo("(7/7) Symlinking Metamask build into Greenboard workspace...");
shell.exec(
  "ln -s /tmp/metamask-extension/dist/chrome packages/greenboard/extension",
  { silent }
);

shell.echo("Ready!");
