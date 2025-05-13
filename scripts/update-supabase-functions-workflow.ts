#!/usr/bin/env ts-node
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
// Using Node.js types for process

// Define paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, "..");
const FUNCTIONS_CONFIG_PATH = path.join(
  PROJECT_ROOT,
  "apps/supabase/functions.config.json",
);
const WORKFLOW_PATH = path.join(
  PROJECT_ROOT,
  ".github/workflows/supabase-functions.yml",
);

// Define types
interface FunctionConfig {
  name: string;
  jwt: boolean;
}

interface WorkflowConfig {
  name: string;
  on: any;
  jobs: {
    deploy: {
      "runs-on": string;
      env: Record<string, string>;
      steps: any[];
    };
  };
}

// Read the functions configuration
function readFunctionsConfig(): FunctionConfig[] {
  try {
    const configContent = fs.readFileSync(FUNCTIONS_CONFIG_PATH, "utf-8");
    return JSON.parse(configContent);
  } catch (error) {
    console.error("Error reading functions config:", error);
    process.exit(1);
    return []; // This line will never be reached, but satisfies TypeScript
  }
}

// Read the workflow file
function readWorkflowConfig(): WorkflowConfig {
  try {
    const workflowContent = fs.readFileSync(WORKFLOW_PATH, "utf-8");
    return yaml.load(workflowContent) as WorkflowConfig;
  } catch (error) {
    console.error("Error reading workflow file:", error);
    process.exit(1);
    return {} as WorkflowConfig; // This line will never be reached, but satisfies TypeScript
  }
}

// Check if the workflow file is in sync with the functions configuration
function checkWorkflowSync(functions: FunctionConfig[]): boolean {
  // Read the current workflow
  const workflow = readWorkflowConfig();

  // Find the function deployment step by looking for steps with "Deploy Supabase functions" name
  const deployFunctionSteps = workflow.jobs.deploy.steps.filter(
    (step) => step.name === "Deploy Supabase functions",
  );

  // If we don't have exactly one function deployment step, they're out of sync
  if (deployFunctionSteps.length !== 1) {
    console.error(
      `Mismatch detected: Workflow has ${deployFunctionSteps.length} function deployment steps, but should have exactly 1`,
    );
    return false;
  }

  // Check if the deployment step contains the correct function command
  const deployStep = deployFunctionSteps[0];
  if (!deployStep || !deployStep.run) {
    console.error(
      "Mismatch detected: Function deployment step is missing a run command",
    );
    return false;
  }

  // Check if the deployment step contains all the functions
  const deployStepRun = deployStep.run.trim();
  let allFunctionsIncluded = true;

  // For now, we only support a single function in the workflow
  // In the future, this could be expanded to support multiple functions
  if (functions.length !== 1) {
    console.error(
      `Mismatch detected: Config has ${functions.length} functions, but workflow currently supports only 1`,
    );
    return false;
  }

  const func = functions[0];

  // Ensure func is defined before using it
  if (!func) {
    console.error(`Mismatch detected: Function at index 0 is undefined`);
    return false;
  }

  const jwtFlag = func.jwt ? "" : "--no-verify-jwt";
  const expectedCommand =
    `pnpm supabase:functions:deploy ${func.name} --project-ref \${{ secrets.PROJECT_ID }} ${jwtFlag}`.trim();

  if (!deployStepRun.includes(expectedCommand)) {
    console.error(
      `Mismatch detected for function '${func.name}':\nExpected command not found in: ${deployStepRun}`,
    );
    return false;
  }

  // If we got here, everything is in sync
  return true;
}

// Update the workflow file with function deployment steps
function updateWorkflow(functions: FunctionConfig[]): void {
  // Validate functions array
  if (functions.length === 0) {
    console.error("No functions defined in configuration");
    process.exit(1);
    return; // TypeScript needs this return
  }

  // Get the first function (we know it exists now)
  const firstFunction = functions[0] as FunctionConfig;
  const jwtFlag = firstFunction.jwt ? "" : "--no-verify-jwt";
  const deployCommand =
    `pnpm supabase:functions:deploy ${firstFunction.name} --project-ref \${{ secrets.PROJECT_ID }} ${jwtFlag}`.trim();

  // Read the current workflow
  const workflow = readWorkflowConfig();

  // Preserve the existing workflow structure
  const existingSteps = workflow.jobs.deploy.steps;

  // Find the function deployment step index
  const deployFunctionStepIndex = existingSteps.findIndex(
    (step) => step.name === "Deploy Supabase functions",
  );

  // If we couldn't find the deployment step, create a new workflow structure
  if (deployFunctionStepIndex === -1) {
    console.log("Creating new workflow structure with standard steps");

    // Create a standard workflow structure
    workflow.jobs.deploy.steps = [
      {
        name: "Checkout repository",
        uses: "actions/checkout@v4",
      },
      {
        name: "Setup Node.js",
        uses: "actions/setup-node@v4",
        with: {
          "node-version": 18,
        },
      },
      {
        name: "Setup pnpm",
        uses: "pnpm/action-setup@v3",
        with: {
          version: "9.0.0",
        },
      },
      {
        name: "Install dependencies",
        run: "pnpm install --frozen-lockfile",
      },
      {
        name: "Setup Supabase CLI",
        uses: "supabase/setup-cli@v1",
        with: {
          version: "latest",
        },
      },
      {
        name: "Run database migrations",
        run: "cd apps/supabase && supabase db push --project-ref \${{ secrets.PROJECT_ID }}",
      },
      {
        name: "Deploy Supabase functions",
        run: deployCommand,
      },
    ];
  } else {
    // Update the existing deployment step
    workflow.jobs.deploy.steps[deployFunctionStepIndex] = {
      name: "Deploy Supabase functions",
      run: deployCommand,
    };
  }

  // Write the updated workflow back to file
  try {
    const updatedYaml = yaml.dump(workflow, { lineWidth: 120 });
    fs.writeFileSync(WORKFLOW_PATH, updatedYaml, "utf-8");
    console.log("Successfully updated workflow file with function deployments");
  } catch (error) {
    console.error("Error writing updated workflow:", error);
    process.exit(1);
  }
}

// Main function
function main(): void {
  // Check if we're in verify-only mode
  const verifyOnly = process.argv.includes("--verify");

  console.log("Reading functions configuration...");
  const functions = readFunctionsConfig();

  console.log(`Found ${functions.length} function(s) to configure in workflow`);

  if (!checkWorkflowSync(functions)) {
    if (verifyOnly) {
      console.error("Workflow is out of sync with functions configuration");
      process.exit(1); // Exit with error code
    } else {
      console.log("Workflow is out of sync, updating...");
      updateWorkflow(functions);
    }
  } else {
    console.log("Workflow is already up to date");
  }
}

// Run the script
main();
