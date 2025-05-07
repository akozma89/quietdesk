/* eslint-disable turbo/no-undeclared-env-vars */
import { Logger } from "../src/index";

// Get Axiom credentials from environment variables
function getCredentials() {
  const token = process.env.AXIOM_TOKEN;
  const dataset = process.env.AXIOM_DATASET;

  if (!token || !dataset) {
    console.error("Error: Axiom token and dataset are required.");
    console.error("Set environment variables AXIOM_TOKEN and AXIOM_DATASET");
    console.error(
      "Example: AXIOM_TOKEN=your-token AXIOM_DATASET=your-dataset pnpm test:local",
    );
    process.exit(1);
  }

  return { token, dataset };
}

const { token: AXIOM_TOKEN, dataset: AXIOM_DATASET } = getCredentials();

async function testServerLogger() {
  console.log("Testing Server Logger...");

  // Create logger
  const logger = new Logger(AXIOM_TOKEN, AXIOM_DATASET);

  // Send some test logs
  logger.info("Test info message");
  logger.warn("Test warning message");
  logger.error("Test error message");

  // Flush logs to ensure they're sent
  console.log("Flushing logs...");
  await logger.flush();

  console.log("Logs sent successfully!");
}

// Run the test with a timeout to ensure it completes
const TEST_TIMEOUT = 10000; // 10 seconds

Promise.race([
  testServerLogger(),
  new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Test timed out after ${TEST_TIMEOUT}ms`));
    }, TEST_TIMEOUT);
  }),
])
  .then(() => {
    console.log("\n\nTest completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n\nTest failed:", error);
    process.exit(1);
  });
