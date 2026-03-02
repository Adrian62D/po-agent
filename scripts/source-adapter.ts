#!/usr/bin/env npx tsx
/**
 * Source Adapter — Framework Default (GitHub / Resume)
 *
 * Handles lifecycle interactions with the source system that triggered the agent.
 * This default implementation handles GitHub PR comments and resume events.
 * Consumers can override with `.po-agent/scripts/source-adapter.ts` for other
 * source systems (Azure DevOps, Slack, Jira, etc.).
 *
 * Commands:
 *   acknowledge <source_json>
 *     → Acknowledge receipt (add reaction to PR comment)
 *
 *   fetch-context <source_json>
 *     → Print context text to stdout (appended to conversation_context.txt)
 *
 *   format-artifacts <source_json> <manifest_json_path>
 *     → Print formatted artifact block to stdout
 *
 *   post-response <source_json> <response_file> <cost_usd> <workflow_url>
 *     → Post the agent's response back to the source system (posting only, no status detection)
 *
 *   post-cancel <source_json> <message> <workflow_url>
 *     → Post cancellation notice to the source system
 *
 * Environment:
 *   GH_TOKEN — GitHub token (for gh CLI)
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

// ── Types ────────────────────────────────────────────────────────────────

interface SourceContext {
  source: string;
  pr_number?: string;
  comment_id?: string;
  comment_user?: string;
  message?: string;
  resume_trigger?: string;
  resume_result?: string;
  resume_attempt?: string;
  resume_workflow_summary?: string;
  [key: string]: string | undefined;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function gh(args: string): string {
  try {
    return execSync(`gh ${args}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    }).trim();
  } catch (err: any) {
    const stderr = err.stderr?.toString().trim() ?? "";
    throw new Error(`gh ${args.split(" ")[0]} failed: ${stderr || err.message}`);
  }
}

function parseSourceContext(json: string): SourceContext {
  try {
    return JSON.parse(json);
  } catch {
    console.error("[source-adapter] Failed to parse source context JSON");
    process.exit(1);
  }
}

function readResponseFile(path: string): string {
  try {
    return readFileSync(path, "utf-8");
  } catch {
    return "";
  }
}

// ── Commands ─────────────────────────────────────────────────────────────

function acknowledge(ctx: SourceContext): void {
  if (ctx.source !== "github") return;

  const commentId = ctx.comment_id;
  if (!commentId || commentId === "null") return;

  const repo = process.env.GITHUB_REPOSITORY;
  if (!repo) return;

  const [owner, repoName] = repo.split("/");

  // Use gh api to add eyes reaction
  try {
    gh(
      `api repos/${owner}/${repoName}/issues/comments/${commentId}/reactions ` +
      `-f content=eyes --silent`
    );
    console.error("[source-adapter] Added eyes reaction to comment");
  } catch {
    console.error("[source-adapter] Failed to add reaction (non-fatal)");
  }
}

function fetchContext(ctx: SourceContext): void {
  const source = ctx.source;
  const prNumber = ctx.pr_number;

  if ((source === "github" || source === "resume") && prNumber && prNumber !== "null") {
    console.log(`=== Pull Request #${prNumber} ===`);

    try {
      const prData = gh(
        `pr view ${prNumber} --json title,body,headRefName,baseRefName,files,comments`
      );
      const pr = JSON.parse(prData);

      console.log(`**Title:** ${pr.title || "N/A"}`);
      console.log(`**Branch:** ${pr.headRefName || "?"} \u2192 ${pr.baseRefName || "?"}`);
      console.log("");
      console.log("**Description:**");
      console.log(pr.body || "No description");
      console.log("");
      console.log("**Changed Files:**");
      if (pr.files) {
        pr.files
          .slice(0, 20)
          .forEach((f: any) => console.log(f.path));
      }
      console.log("");
      console.log("**Recent Comments:**");
      if (pr.comments) {
        pr.comments
          .slice(-5)
          .forEach((c: any) => {
            const author = c.author?.login || "unknown";
            const firstLine = (c.body || "").split("\n")[0] || "";
            console.log(`- ${author}: ${firstLine}`);
          });
      }
    } catch {
      console.log("(Could not fetch PR data)");
    }
  }

  // Resume context
  if (source === "resume" && prNumber) {
    console.log("");
    console.log("=== RESUME CONTEXT ===");
    console.log(`You are **resuming** work on PR #${prNumber}.`);
    console.log(
      `Trigger: ${ctx.resume_trigger || "unknown"} \u2014 Result: **${ctx.resume_result || "unknown"}**`
    );
    if (ctx.resume_workflow_summary) {
      console.log(`Workflow results: ${ctx.resume_workflow_summary}`);
    }
    console.log(`Attempt ${ctx.resume_attempt || "1"}.`);
    console.log("=== END RESUME CONTEXT ===");
  }
}

function formatArtifacts(ctx: SourceContext, manifestPath: string): void {
  if (!existsSync(manifestPath)) return;

  let manifest: any;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch {
    return;
  }

  const artifacts = manifest.artifacts;
  if (!artifacts || artifacts.length === 0) return;

  const runUrl = `https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`;
  const dlUrl = `${runUrl}#artifacts`;

  // GitHub/resume: Markdown artifact block
  console.log("\n\n---");
  console.log("\ud83d\udcce **Artifacts**");

  for (const artifact of artifacts) {
    const filename = artifact.filename;
    const type = artifact.type;
    let icon = "\ud83d\udcc4";
    if (type === "image") icon = "\ud83d\uddbc\ufe0f";
    if (type === "video") icon = "\ud83c\udfac";
    console.log(`\n- ${icon} \`${filename}\` \u2014 [download from artifacts](${dlUrl})`);
  }
}

function postResponse(
  ctx: SourceContext,
  responseFile: string,
  costUsd: string,
  workflowUrl: string
): void {
  const source = ctx.source;
  const prNumber = ctx.pr_number;
  const response = readResponseFile(responseFile);

  if ((source !== "github" && source !== "resume") || !prNumber || prNumber === "null") {
    return;
  }

  // Add rocket reaction to original comment (github source only)
  if (source === "github" && ctx.comment_id && ctx.comment_id !== "null") {
    const repo = process.env.GITHUB_REPOSITORY;
    if (repo) {
      const [owner, repoName] = repo.split("/");
      try {
        gh(
          `api repos/${owner}/${repoName}/issues/comments/${ctx.comment_id}/reactions ` +
          `-f content=rocket --silent`
        );
      } catch {
        // non-fatal
      }
    }
  }

  // Build comment body
  const trimmedResponse = response.slice(-10000) || "The agent did not produce output. Check workflow logs.";
  const costLine = costUsd && costUsd !== "0" ? `\n_LLM Cost: ~${costUsd} USD_` : "";
  const mention = ctx.comment_user && source === "github" ? `@${ctx.comment_user}\n\n` : "";
  const resumeLabel =
    source === "resume" && ctx.resume_attempt
      ? `## \ud83d\udd04 Resume (Attempt ${ctx.resume_attempt})\n\n`
      : "";

  const repo = process.env.GITHUB_REPOSITORY || "";
  const runId = process.env.GITHUB_RUN_ID || "";
  const body =
    `${resumeLabel}${mention}${trimmedResponse}\n\n---\n` +
    `*\ud83e\udd16 [workflow run](https://github.com/${repo}/actions/runs/${runId})*${costLine}`;

  try {
    // Write body to temp file to avoid shell escaping issues
    const tmpFile = "/tmp/source-adapter-comment.md";
    require("fs").writeFileSync(tmpFile, body);
    gh(`pr comment ${prNumber} --body-file "${tmpFile}"`);
    console.error("[source-adapter] Posted response to PR");
  } catch (err: any) {
    console.error(`[source-adapter] Failed to post response: ${err.message}`);
  }
}

function postCancel(ctx: SourceContext, message: string, workflowUrl: string): void {
  const source = ctx.source;
  const prNumber = ctx.pr_number;

  if ((source !== "github" && source !== "resume") || !prNumber || prNumber === "null") {
    return;
  }

  const body = `${message}\n\n---\n*\ud83e\udd16 [cancelled run](${workflowUrl})*`;

  try {
    const tmpFile = "/tmp/source-adapter-cancel.md";
    require("fs").writeFileSync(tmpFile, body);
    gh(`pr comment ${prNumber} --body-file "${tmpFile}"`);
    console.error("[source-adapter] Posted cancel notice to PR");
  } catch (err: any) {
    console.error(`[source-adapter] Failed to post cancel notice: ${err.message}`);
  }
}

// ── CLI dispatch ─────────────────────────────────────────────────────────

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "acknowledge": {
    const ctx = parseSourceContext(args[0]);
    acknowledge(ctx);
    break;
  }
  case "fetch-context": {
    const ctx = parseSourceContext(args[0]);
    fetchContext(ctx);
    break;
  }
  case "format-artifacts": {
    const ctx = parseSourceContext(args[0]);
    formatArtifacts(ctx, args[1]);
    break;
  }
  case "post-response": {
    const ctx = parseSourceContext(args[0]);
    postResponse(ctx, args[1], args[2], args[3]);
    break;
  }
  case "post-cancel": {
    const ctx = parseSourceContext(args[0]);
    postCancel(ctx, args[1], args[2]);
    break;
  }
  default:
    // Unknown command — exit silently (no-op for unknown sources/commands)
    if (command) {
      console.error(`[source-adapter] Unknown command: ${command}`);
    }
    process.exit(0);
}
