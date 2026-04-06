const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Downloads the specific repository at the exact paused SHA into a temporary workspace.
 * 
 * @param {string} repositoryUrl - The clone URL of the target GitHub repository
 * @param {string} commitSha - The exact commit SHA the paused workflow is running against
 * @returns {string} The absolute path to the local temporary workspace
 */
function provisionWorkspace(repositoryUrl, commitSha) {
  // Create a unique temporary directory
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'buffer-workspace-'));
  console.log(`[Workspace] Provisioning fresh workspace at ${tempDir}`);

  try {
    // Clone the repository
    console.log(`[Workspace] Cloning ${repositoryUrl}...`);
    execSync(`git clone ${repositoryUrl} .`, { cwd: tempDir, stdio: 'ignore' });
    
    // Checkout the exact commit
    console.log(`[Workspace] Checking out commit ${commitSha}...`);
    execSync(`git checkout ${commitSha}`, { cwd: tempDir, stdio: 'ignore' });

    console.log(`[Workspace] Provisioning complete.`);
    return tempDir;
  } catch (err) {
    console.error(`[Workspace] Failed to provision workspace:`, err.message);
    throw err;
  }
}

/**
 * Cleans up the temporary workspace after execution.
 * 
 * @param {string} workspacePath 
 */
function cleanupWorkspace(workspacePath) {
  try {
    console.log(`[Workspace] Cleaning up workspace ${workspacePath}...`);
    fs.rmSync(workspacePath, { recursive: true, force: true });
  } catch (err) {
    console.error(`[Workspace] Failed to clean up workspace:`, err.message);
  }
}

module.exports = { provisionWorkspace, cleanupWorkspace };
