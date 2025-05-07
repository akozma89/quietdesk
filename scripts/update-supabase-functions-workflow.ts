#!/usr/bin/env ts-node
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
// Using Node.js types for process

// Define paths relative to project root
const PROJECT_ROOT = path.resolve(__dirname, '..');
const FUNCTIONS_CONFIG_PATH = path.join(PROJECT_ROOT, 'apps/supabase/functions.config.json');
const WORKFLOW_PATH = path.join(PROJECT_ROOT, '.github/workflows/supabase-functions.yml');

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
      'runs-on': string;
      env: Record<string, string>;
      steps: any[];
    };
  };
}

// Read the functions configuration
function readFunctionsConfig(): FunctionConfig[] {
  try {
    const configContent = fs.readFileSync(FUNCTIONS_CONFIG_PATH, 'utf-8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error('Error reading functions config:', error);
    process.exit(1);
    return []; // This line will never be reached, but satisfies TypeScript
  }
}

// Read the workflow file
function readWorkflowConfig(): WorkflowConfig {
  try {
    const workflowContent = fs.readFileSync(WORKFLOW_PATH, 'utf-8');
    return yaml.load(workflowContent) as WorkflowConfig;
  } catch (error) {
    console.error('Error reading workflow file:', error);
    process.exit(1);
    return {} as WorkflowConfig; // This line will never be reached, but satisfies TypeScript
  }
}

// Check if the workflow file is in sync with the functions configuration
function checkWorkflowSync(functions: FunctionConfig[]): boolean {
  // Read the current workflow
  const workflow = readWorkflowConfig();
  
  // Get the current deployment steps (excluding the initial setup steps)
  const currentDeploySteps = workflow.jobs.deploy.steps.slice(2);
  
  // If the number of deployment steps doesn't match the number of functions, they're out of sync
  if (currentDeploySteps.length !== functions.length) {
    console.error(`Mismatch detected: Workflow has ${currentDeploySteps.length} function deployments, but config has ${functions.length} functions`);
    return false;
  }
  
  // Check each function deployment step
  for (let i = 0; i < functions.length; i++) {
    const func = functions[i];
    const step = currentDeploySteps[i];
    
    if (!step || !step.run) {
      console.error(`Mismatch detected: Step ${i + 2} is missing a run command`);
      return false;
    }
    
    // Ensure func is defined before using it
    if (!func) {
      console.error(`Mismatch detected: Function at index ${i} is undefined`);
      return false;
    }
    
    const jwtFlag = func.jwt ? '' : '--no-verify-jwt';
    const expectedCommand = `supabase functions deploy ${func.name} --project-ref \${{ secrets.PROJECT_ID }} ${jwtFlag}`.trim();
    
    if (step.run.trim() !== expectedCommand) {
      console.error(`Mismatch detected for function '${func.name}':\nExpected: ${expectedCommand}\nActual: ${step.run.trim()}`);
      return false;
    }
  }
  
  // If we got here, everything is in sync
  return true;
}

// Update the workflow file with function deployment steps
function updateWorkflow(functions: FunctionConfig[]): void {
  // Read the current workflow
  const workflow = readWorkflowConfig();
  
  // Keep the initial steps (checkout and setup)
  const initialSteps = workflow.jobs.deploy.steps.slice(0, 2);
  
  // Create updated steps array with initial steps
  const updatedSteps = [...initialSteps];
  
  // Add deployment steps for each function
  functions.forEach(func => {
    const jwtFlag = func.jwt ? '' : '--no-verify-jwt';
    updatedSteps.push({
      run: `supabase functions deploy ${func.name} --project-ref \${{ secrets.PROJECT_ID }} ${jwtFlag}`.trim()
    });
  });
  
  // Update the workflow with new steps
  workflow.jobs.deploy.steps = updatedSteps;
  
  // Write the updated workflow back to file
  try {
    const updatedYaml = yaml.dump(workflow, { lineWidth: 120 });
    fs.writeFileSync(WORKFLOW_PATH, updatedYaml, 'utf-8');
    console.log('Successfully updated workflow file with function deployments');
  } catch (error) {
    console.error('Error writing updated workflow:', error);
    process.exit(1);
  }
}

// Main function
function main(): void {
  // Check if we're in verify-only mode
  const verifyOnly = process.argv.includes('--verify');
  
  console.log('Reading functions configuration...');
  const functions = readFunctionsConfig();
  
  console.log(`Found ${functions.length} function(s) to configure in workflow`);
  
  if (!checkWorkflowSync(functions)) {
    if (verifyOnly) {
      console.error('Workflow is out of sync with functions configuration');
      process.exit(1); // Exit with error code
    } else {
      console.log('Workflow is out of sync, updating...');
      updateWorkflow(functions);
    }
  } else {
    console.log('Workflow is already up to date');
  }
}

// Run the script
main();
