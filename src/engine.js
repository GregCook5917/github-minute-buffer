const { Act } = require("@kie/act-js");

/**
 * The Buffer Controller Execution Engine
 * Parses the local `.github/workflows` and executes a specific job locally inside Docker using `act`.
 * 
 * @param {string} repoWorkspaceAbsPath - The absolute path to the cloned repository for the target commit SHA
 * @param {string} jobName - The exact name of the job from the YAML workflow
 */
async function executePausedGitHubJob(repoWorkspaceAbsPath, jobName) {
  console.log(`[Engine] Starting execution for job '${jobName}' in ${repoWorkspaceAbsPath}...`);
  
  try {
    // Initialize the Act wrapper pointing to the repository workspace
    const act = new Act(repoWorkspaceAbsPath);
    
    // Execute the specific job decoupled from GitHub
    // act-js will spin up the necessary Docker containers and execute the steps
    console.log(`[Engine] Spinning up Docker containers to emulate GitHub runner...`);
    const executionResult = await act.runJob(jobName);
    
    console.log(`[Engine] Execution complete. Steps run: ${executionResult.length}`);
    
    // Check if any step failed
    const failedSteps = executionResult.filter(step => step.status !== 0);
    if (failedSteps.length > 0) {
      console.error(`[Engine] Job failed. Failed steps:`, failedSteps);
      return { success: false, logs: executionResult };
    }

    return { success: true, logs: executionResult };

  } catch (error) {
    console.error("[Engine] Critical failure in execution engine:", error);
    return { success: false, error: error.message };
  }
}

module.exports = { executePausedGitHubJob };
