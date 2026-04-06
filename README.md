# Session Walkthrough: GitHub Minute Buffer Platform

## The Vision
In response to GitHub's plan to start charging per-minute for self-hosted runners, we set out to build a platform that could intercept workflows and completely pause the billing clock, executing the heavy workloads externally without breaking GitHub Actions native dependency graphs.

We've successfully architected and scaffolded out the **Buffer Platform**. 

## The "Jedi Mind Trick" Architecture
Instead of reverse-engineering a complex runner proxy, we utilized **Environment Protection Rules**. By routing jobs to a protected environment (`buffer-env`), GitHub natively pauses the billing clock and waits for a manual rollout approval before dispatching it to a runner.

Our platform listens for that pause, does the work for GitHub locally, and then automatically approves the gate so the job finishes instantly.

---

## 🏗️ The Core Services Scaffolded

We built out the entire Node.js monorepo encompassing the three main pillars of the platform:

### 1. The Webhook Listener (`src/server.js`)
An Express server running the `@octokit/webhooks` library. It acts as the nervous system, listening to GitHub for `workflow_job` events with a status of `queued`. When it detects a job paused at the gate, it triggers the execution flow.

### 2. The Workspace & Execution Engine (`src/workspace.js` & `src/engine.js`)
Because official runners require a GitHub job dispatch token, we cannot use them while the job is technically "waiting for approval". Instead, we use `act` (the premier open-source Actions emulator) wrapped via `@kie/act-js`.
*   The provisioner dynamically checks out the exact Git commit SHA of the paused job.
*   The system spins up isolated Docker containers to parse and natively execute the YAML steps, fully decoupled from GitHub.

### 3. The Gatekeeper API (`src/gatekeeper.js`)
Once `act` finishes executing successfully, the Gatekeeper uses `@octokit/rest` to call back home to GitHub. It locates the `pending_deployments` for the job's run ID and submits an `approved` state. GitHub releases the job, our runner runs the 1-second placeholder, and all downstream jobs natively resume!

---

## 🚀 Running The Platform

To deploy the engine, we wrapped the Node app in a custom `Dockerfile` that packages the Docker CLI and mounts it to the host daemon via `docker-compose.yml`.

> [!IMPORTANT]
> **Docker-out-of-Docker (DooD)**
> Because `act` needs to spin up ubuntu/macos/windows containers locally to run the steps, our Node.js platform container must have access to the `/var/run/docker.sock` of the host machine.

```yaml
# Start the platform locally or in production
docker-compose up -d
```

*(Be sure to replace your `GITHUB_WEBHOOK_SECRET` and `GITHUB_PAT` inside the `docker-compose.yml` file prior to boot).*
