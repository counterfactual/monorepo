const shell = require("shelljs");
const path = require("path");
const hub = JSON.parse(
  require("fs").readFileSync("./packages/simple-hub-server/.env-cmdrc")
);

if (process.argv.includes("--with-prepare")) {
  shell.echo("Preparing environment...");
  shell.exec("node ./e2e-prepare.js");
}

if (!process.env.NODE_MNEMONIC) {
  console.error(
    "Please set the NODE_MNEMONIC environment variable for the Hub."
  );
  process.exit(1);
}

if (!shell.which("sqlite3")) {
  console.warn(
    "`sqlite3` not found, be sure to clean up the Hub's DB manually."
  );
} else {
  shell.exec(
    `sqlite3 ${path.resolve(
      __dirname,
      "packages/simple-hub-server",
      hub.test.DB_FILE
    )} "DELETE FROM users"`
  );
}

shell.echo("Cleaning up...");
shell.rm("-rf", "/tmp/greenboard");

shell.echo("Serving Wallet UI & Hub...");
shell.exec("yarn run:wallet:e2e", { async: true }).stdout.pipe(process.stdout);

shell.echo("Running tests...");
shell.cd("packages/greenboard");
shell.exec(`yarn start ${process.argv.slice(2).join(" ")}`);

shell.exec("killall -9 node && killall -9 chromedriver");
