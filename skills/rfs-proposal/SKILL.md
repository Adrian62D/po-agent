---
name: rfs-proposal
description: File a Request for Skill (RFS) when a skill gap is detected during execution.
disable-model-invocation: true
---

# Request for Skill (RFS) Proposal

Use this skill when you detect a skill gap — a task type or behavioral pattern that no existing skill covers adequately.

**Golden rule:** Never block on a gap. Complete the task first, then file the RFS at the end.

## Rate Limit

**At most 1 RFS per run.** If you detect multiple gaps, file the most impactful one and note the others in the issue body.

## Step 1: Check for Duplicates

Before filing, search for existing RFS issues:

```bash
gh issue list --label "rfs" --state open --json number,title --jq '.[] | "#\(.number) \(.title)"'
```

If a matching RFS already exists, skip filing. Optionally add a comment noting the new occurrence.

## Step 2: Create the RFS Issue

File a GitHub Issue using the structured template:

```bash
gh issue create \
  --label "rfs,rfs:proposed" \
  --title "RFS: <proposed-skill-name>" \
  --body "$(cat <<'BODY'
## Request for Skill

| Field | Value |
|-------|-------|
| **Skill name** | `<kebab-case-name>` |
| **Gap type** | `new-skill` or `skill-extension` |
| **Extends skill** | `<existing-skill-name>` (if skill-extension, otherwise N/A) |
| **Installation target** | `consumer` (.po-agent/skills/) or `framework` (built-in) |

### Trigger Context

What the agent was doing when the gap was detected:
- Task type: <description>
- Skills consulted: <list of /skill-name checked>
- Why existing skills fell short: <explanation>

### Desired Behavior

What the skill should teach the agent to do:
<detailed description of the behavioral pattern>

### Draft SKILL.md

<If you have enough context, draft the SKILL.md content here. Otherwise write "Needs human authoring.">

```markdown
---
name: <skill-name>
description: <one-line description>
disable-model-invocation: true
---

# <Skill Title>

<Instructions>
```

### Additional Gaps (if any)

<List other gaps detected in this run that were NOT filed as separate RFS issues>

### Source

- Run: <link to the GitHub Actions run or PR, if available>
BODY
)"
```

Adapt the template fields based on the actual gap detected. The key fields are:
- **Skill name**: kebab-case, descriptive
- **Gap type**: `new-skill` if nothing covers this area; `skill-extension` if an existing skill is close but lacks guidance
- **Installation target**: `consumer` for project-specific skills, `framework` for skills that benefit all PO Agent users

## Step 3: Notify on Current Thread

After filing the RFS, add a short note to the current PR or thread:

> ✅ Task completed. Filed [RFS #N](link) for a missing capability: **<skill-name>** — <one-sentence description of the gap>.

This goes in your normal response — do NOT create a separate comment just for the notification.

## Step 4: Log to RFS Log

Append a row to `.po-agent/rfs-log.md` (create the file if it doesn't exist):

```bash
# Create the log file with header if it doesn't exist
if [ ! -f .po-agent/rfs-log.md ]; then
  mkdir -p .po-agent
  cat > .po-agent/rfs-log.md << 'HEADER'
# RFS Log

| Date | RFS # | Skill Name | Gap Type | Status |
|------|-------|------------|----------|--------|
HEADER
fi

# Append the new entry
echo "| $(date +%Y-%m-%d) | #<NUMBER> | \`<skill-name>\` | <gap-type> | proposed |" >> .po-agent/rfs-log.md
```

Commit and push the log update:

```bash
git add .po-agent/rfs-log.md && git commit -m "chore: log RFS #<NUMBER>" && git push
```
