require("dotenv").config();
const express = require("express");
const { Webhooks, createNodeMiddleware } = require("@octokit/webhooks");
const { executePausedGitHubJob } = require("./engine");

const app = express();

// Initialize the Octokit Webhook listener
const webhooks = new Webhooks({
  secret: process.env.GITHUB_WEBHOOK_SECRET || "development_secret",
});

/**
 * Listen for the 'workflow_job' event from GitHub
 * We specifically look for jobs that are queued and targeting our buffer environment
 */
webhooks.on("workflow_job", async ({ id, name, payload }) => {
  const jobStatus = payload.workflow_job.status; // 'queued', 'in_progress', 'completed'
  const jobName = payload.workflow_job.name;
  
  console.log(`[Webhook] Received workflow_job event: ${jobName} is ${jobStatus}`);

  // In a real execution, we would check if this job is the one waiting at our 'buffer-env'.
  // GitHub emits a `queued` or `waiting` status when it hits the environment gate.
  // For the POC, we look for the proxy job name "job_a" or "The Intercepted Job".
  if (jobStatus === "queued" || jobStatus === "waiting") {
    console.log(`[Controller] Intercepted a paused job: ${jobName}`);
    
    // TODO: Dynamic workspace provisioning.
    // In production, we would git clone payload.repository.clone_url @ payload.workflow_job.head_sha
    // into a temporary directory here.
    const workspaceDir = __dirname; // Dummy path for now
    
    // Offload the hard execution to our engine
    const executionResult = await executePausedGitHubJob(workspaceDir, jobName);
    
    if (executionResult.success) {
      console.log(`[Gatekeeper] Job completed successfully locally! Hitting GitHub API to approve the environment.`);
      // TODO: Call Octokit REST API to approve the pending_deployments gate
    }
  }
});

webhooks.onError((error) => {
  console.error(`[Webhook] Error listening to webhooks:`, error.message);
});

// Use Octokit's built-in express middleware
app.use("/api/webhooks", createNodeMiddleware(webhooks));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Buffer Platform running on port ${PORT}`);
  console.log(`Webhook listener mounted at POST /api/webhooks`);
});
