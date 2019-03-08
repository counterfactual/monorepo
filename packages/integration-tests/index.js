const tests = require("./tests");
const setup = require("./tests/setup");
const runner = require("./utils/web-driver");

runner(setup, tests).then(() => {
  console.log("Done.");
});
