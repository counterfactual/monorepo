/**
 * Use this array to set the order of execution for all E2E tests.
 *
 * IMPORTANT:
 * Keep in mind that if you create a new scenario, you'll need to include it
 * on this list, otherwise it won't be executed.
 */
const testSequence = [
  "tests/onboarding.spec.ts",
  "tests/login.spec.ts",
  "tests/deposit.spec.ts",
  "tests/withdraw.spec.ts"
];

// Import the default test sequencer.
const Sequencer = require("@jest/test-sequencer").default;

module.exports = class extends Sequencer {
  /**
   * Sorts the tests by order of appearance in the `testSequence` array.
   */
  sort(tests) {
    // TODO: Add the ability to run tests in dependency order.
    return testSequence.map(testName =>
      tests.find(test => test.path.endsWith(testName))
    );
  }
};
