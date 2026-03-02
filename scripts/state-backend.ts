#!/usr/bin/env npx tsx
/**
 * State Backend — Framework Default (GitHub PR Labels)
 *
 * Manages PO Agent state via GitHub PR labels using the `gh` CLI.
 * Entity ID = PR number.
 *
 * Commands:
 *   resolve-entity <pr_number>       → prints entity_id (= pr_number)
 *   is-waiting <entity_id>           → exit 0 if waiting-ci, 1 otherwise
 *   get-status <entity_id>           → prints current status or "none"
 *   set-status <entity_id> <status>  → sets status label (any lowercase-hyphenated value)
 *   get-attempt <entity_id>          → prints attempt number
 *   increment-attempt <entity_id>    → prints new attempt number
 *   on-max-attempts <entity_id> <max> → post warning comment, set failed
 */

import { execSync } from "child_process";

const LABEL_PREFIX = "po-agent:";

// Framework-reserved statuses: the framework reads and acts on these.
// - "in-progress": triggers attempt counter logic
// - "waiting-ci": triggers the resume gate (is-waiting check)
// - "done", "failed": terminal states
// - "waiting-human": framework-detected but passively stored
//
// Consumers may define additional statuses (e.g. "waiting-review",
// "waiting-deployment", "blocked"). These are stored as labels and
// cleaned up on transitions, but the framework never branches on them.
const FRAMEWORK_STATUSES = [
  "in-progress",
  "waiting-ci",
  "waiting-human",
  "done",
  "failed",
] as const;

// Pattern for valid status strings: lowercase letters, digits, hyphens.
// Must be non-empty and not start/end with a hyphen.
const STATUS_PATTERN = /^[a-z][a-z0-9-]*[a-z0-9]$/;

function isValidStatus(status: string): boolean {
  return status.length >= 2 && STATUS_PATTERN.test(status);
}

// ── Helpers ──────────────────────────────────────────────────────────────

function gh(args: string): string {
  try {
    return execSync(`gh ${args}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch (err: any) {
    const stderr = err.stderr?.toString().trim() ?? "";
    throw new Error(`gh ${args.split(" ")[0]} failed: ${stderr || err.message}`);
  }
}

function getLabels(pr: string): string[] {
  const json = gh(`pr view ${pr} --json labels --jq ".labels[].name"`);
  return json
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function addLabel(pr: string, label: string): void {
  gh(`pr edit ${pr} --add-label "${label}"`);
}

function removeLabel(pr: string, label: string): void {
  try {
    gh(`pr edit ${pr} --remove-label "${label}"`);
  } catch {
    // Label might not exist — ignore
  }
}

function getStatusLabels(labels: string[]): string[] {
  return labels.filter((l) => {
    if (!l.startsWith(LABEL_PREFIX)) return false;
    const value = l.slice(LABEL_PREFIX.length);
    // Exclude attempt labels (po-agent:attempt-N)
    if (value.startsWith("attempt-")) return false;
    return isValidStatus(value);
  });
}

function getAttemptLabel(labels: string[]): string | undefined {
  return labels.find((l) => l.startsWith(`${LABEL_PREFIX}attempt-`));
}

function parseAttempt(label: string | undefined): number {
  if (!label) return 0;
  const match = label.match(/attempt-(\d+)$/);
  return match ? parseInt(match[1], 10) : 0;
}

// ── Commands ─────────────────────────────────────────────────────────────

function resolveEntity(prNumber: string): void {
  // For GitHub labels, entity_id is just the PR number
  console.log(prNumber);
}

function isWaiting(entityId: string): void {
  const labels = getLabels(entityId);
  const waiting = labels.includes(`${LABEL_PREFIX}waiting-ci`);
  process.exit(waiting ? 0 : 1);
}

function getStatus(entityId: string): void {
  const labels = getLabels(entityId);
  const statusLabels = getStatusLabels(labels);
  if (statusLabels.length === 0) {
    console.log("none");
    return;
  }
  // Return the first status found (should only be one)
  const status = statusLabels[0].replace(LABEL_PREFIX, "");
  console.log(status);
}

function setStatus(entityId: string, status: string): void {
  if (!isValidStatus(status)) {
    console.error(
      `Invalid status: '${status}'. Must be lowercase alphanumeric with hyphens (e.g. 'waiting-review').`
    );
    process.exit(1);
  }

  const labels = getLabels(entityId);

  // Remove existing status labels
  for (const label of getStatusLabels(labels)) {
    removeLabel(entityId, label);
  }

  // Add new status label
  addLabel(entityId, `${LABEL_PREFIX}${status}`);

  // If setting in-progress and no attempt label exists, add attempt-1
  if (status === "in-progress") {
    const attemptLabel = getAttemptLabel(labels);
    if (!attemptLabel) {
      addLabel(entityId, `${LABEL_PREFIX}attempt-1`);
    }
  }

  console.error(`[state-backend] Set status to '${status}' on PR #${entityId}`);
}

function getAttempt(entityId: string): void {
  const labels = getLabels(entityId);
  const attemptLabel = getAttemptLabel(labels);
  console.log(parseAttempt(attemptLabel).toString());
}

function incrementAttempt(entityId: string): void {
  const labels = getLabels(entityId);
  const attemptLabel = getAttemptLabel(labels);
  const current = parseAttempt(attemptLabel);
  const next = current + 1;

  // Remove old attempt label
  if (attemptLabel) {
    removeLabel(entityId, attemptLabel);
  }

  // Add new attempt label
  addLabel(entityId, `${LABEL_PREFIX}attempt-${next}`);

  console.log(next.toString());
  console.error(
    `[state-backend] Incremented attempt to ${next} on PR #${entityId}`
  );
}

function onMaxAttempts(entityId: string, max: string): void {
  // Post warning comment
  const body = `\u26a0\ufe0f **PO Agent stopped after ${max} attempts.** Please review and re-trigger manually if needed.`;
  gh(`pr comment ${entityId} --body "${body.replace(/"/g, '\\"')}"`);

  // Set failed status
  setStatus(entityId, "failed");

  console.error(
    `[state-backend] Max attempts (${max}) reached on PR #${entityId}`
  );
}

// ── CLI dispatch ─────────────────────────────────────────────────────────

const [command, ...args] = process.argv.slice(2);

switch (command) {
  case "resolve-entity":
    resolveEntity(args[0]);
    break;
  case "is-waiting":
    isWaiting(args[0]);
    break;
  case "get-status":
    getStatus(args[0]);
    break;
  case "set-status":
    setStatus(args[0], args[1]);
    break;
  case "get-attempt":
    getAttempt(args[0]);
    break;
  case "increment-attempt":
    incrementAttempt(args[0]);
    break;
  case "on-max-attempts":
    onMaxAttempts(args[0], args[1]);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error(
      "Usage: state-backend <command> [args...]"
    );
    console.error(
      "Commands: resolve-entity, is-waiting, get-status, set-status, get-attempt, increment-attempt, on-max-attempts"
    );
    process.exit(1);
}
