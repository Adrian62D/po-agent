# Request for Skills (RFS)

RFS is a lightweight system for PO Agent to **detect skill gaps at runtime** and propose new skills via structured GitHub Issues.

## How It Works

1. **Agent detects a gap** — while working a task, the agent notices it's improvising a pattern that no existing skill covers.
2. **Agent completes the task** — it never blocks on a gap; it finishes the work using best judgment first.
3. **Agent files an RFS** — a structured GitHub Issue with the `rfs` and `rfs:proposed` labels, describing the gap and optionally drafting the skill.
4. **Human reviews** — the team triages the RFS and decides whether to accept or decline it.
5. **Skill gets authored** — either by a human or in a future agent run, the skill is written and merged via PR.

## RFS Lifecycle

```
proposed → accepted → drafting → in-review → fulfilled
                   ↘ declined
```

### Labels

| Label | Meaning |
|-------|---------|
| `rfs` | Base label — present on all RFS issues |
| `rfs:proposed` | Agent filed it, needs triage |
| `rfs:accepted` | Approved for development |
| `rfs:declined` | Won't implement (issue closed) |
| `rfs:drafting` | Skill is being authored |
| `rfs:in-review` | PR open with the SKILL.md |
| `rfs:fulfilled` | Done — skill merged and available |

### Workflow

1. **Triage** (`rfs:proposed` → `rfs:accepted` or `rfs:declined`)
   - Review the gap type, trigger context, and desired behavior
   - Check if an existing skill could be extended instead
   - Decline with a comment explaining why, if not warranted

2. **Author** (`rfs:accepted` → `rfs:drafting`)
   - Write the SKILL.md following the [writing skills](writing-skills.md) guide
   - If the agent provided a draft, use it as a starting point

3. **Review** (`rfs:drafting` → `rfs:in-review`)
   - Open a PR adding the skill to the appropriate location:
     - **Framework skill**: `skills/<name>/SKILL.md` in the po-agent repo
     - **Consumer skill**: `.po-agent/skills/<name>/SKILL.md` in the consumer repo
   - Update `prompts/core.md` routing table if adding a framework skill

4. **Fulfill** (`rfs:in-review` → `rfs:fulfilled`)
   - Merge the PR
   - Close the RFS issue

## For Consumers

### Viewing Open RFS Issues

```bash
# All open RFS issues
gh issue list --label "rfs" --state open

# Only accepted (ready for authoring)
gh issue list --label "rfs:accepted" --state open
```

### RFS Log

The agent maintains a local log at `.po-agent/rfs-log.md` in your repository. This provides a historical record of all gaps detected in your project.

### Controlling RFS Behavior

RFS detection is enabled by default. The agent will file **at most 1 RFS per run** and only for significant gaps (not one-off quirks).

To review what the agent considers a gap, see the detection criteria in `prompts/rfs-detection.md`.

## For Contributors

### Fulfilling an RFS

1. Pick an `rfs:accepted` issue
2. Label it `rfs:drafting`
3. Write the SKILL.md following the format in [writing skills](writing-skills.md)
4. Open a PR, label the issue `rfs:in-review`
5. After merge, label `rfs:fulfilled` and close the issue

### Gap Type Reference

| Gap Type | When to Use |
|----------|-------------|
| `new-skill` | No existing skill covers this area at all |
| `skill-extension` | An existing skill is close but needs additional guidance for a specific scenario |

### Installation Target Reference

| Target | Location | When to Use |
|--------|----------|-------------|
| `consumer` | `.po-agent/skills/` | Project-specific patterns (e.g., deploy to your staging environment) |
| `framework` | `skills/` in po-agent repo | Patterns that benefit all PO Agent users (e.g., database migration workflows) |

## What RFS Does NOT Include

- **No auto-install** — humans always approve via PR merge
- **No manifest files** — skills are single SKILL.md files
- **No agent-driven fulfillment** — the agent proposes skills; authoring is a separate step
- **No skill catalog sync** — can be added later if RFS volume warrants it
