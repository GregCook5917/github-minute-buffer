const { Octokit } = require("@octokit/rest");

/**
 * Gatekeeper Service
 * Approves environment gates for paused workflows.
 */
async function approveEnvironmentGate(repoOwner, repoName, runId, environmentName) {
  try {
    const octokit = new Octokit({
      auth: process.env.GITHUB_PAT || process.env.GITHUB_TOKEN
    });

    console.log(`[Gatekeeper] Fetching pending deployments for run ${runId}...`);
    
    // Get pending deployments
    const response = await octokit.rest.actions.getPendingDeploymentsForRun({
      owner: repoOwner,
      repo: repoName,
      run_id: runId,
    });

    const pendingDeployments = response.data;
    const environmentIds = [];
    
    for (const envObj of pendingDeployments) {
      if (envObj.environment.name === environmentName) {
        environmentIds.push(envObj.environment.id);
      }
    }

    if (environmentIds.length === 0) {
      console.log(`[Gatekeeper] No pending deployments found for environment: ${environmentName}`);
      return false;
    }

    console.log(`[Gatekeeper] Approving environment gate for ${environmentName}...`);
    // Note: depending on the API and GitHub version, state could be 'approved' in reviewCustomDeployments
    await octokit.rest.actions.reviewPendingDeploymentsForRun({
      owner: repoOwner,
      repo: repoName,
      run_id: runId,
      environment_ids: environmentIds,
      state: "approved",
      comment: "Approved by the Buffer Platform Execution Engine",
    });

    console.log(`[Gatekeeper] Environment gate successfully approved!`);
    return true;

  } catch (err) {
    console.error(`[Gatekeeper] Failed to approve environment gate:`, err.message);
    return false;
  }
}

module.exports = { approveEnvironmentGate };
