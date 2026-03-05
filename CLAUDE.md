# PO Agent — AI-Powered Product Owner

## Project Overview

PO Agent is a **GitHub Actions composite action** that wraps Claude Code CLI to act as an AI Product Owner and Senior Developer. It manages the full lifecycle: requirements, investigation, implementation, CI, review, verification, and delivery.

## Architecture

```
action.yml              ← Main composite action (all steps in one job)
prompts/
  core.md               ← Agent persona + skill routing table
  source-github.md      ← GitHub PR trigger behavior
  source-github-issue.md← GitHub Issue trigger behavior
  source-slack.md       ← Slack trigger behavior
  source-resume.md      ← Auto-resume trigger behavior
  source-azure-devops.md← Azure DevOps trigger behavior
  rfs-detection.md      ← Skill gap detection prompt
skills/                 ← Built-in skills (SKILL.md files)
scripts/                ← Shell scripts linked to PATH at runtime
resume/action.yml       ← Resume sub-action (triggers on CI completion)
webhooks/               ← Event relay functions (Slack, AzDo)
docs/                   ← Architecture, quickstart, writing skills, RFS docs
```

## Key Files

- **`action.yml`** (~1500 lines): The core of the project. Contains ALL steps:
  1. Source detection (github/github-issue/slack/resume/azure-devops/webhook/manual)
  2. Secret export
  3. Acknowledge receipt (reaction/comment per source)
  4. Install Claude Code CLI
  5. Setup Node.js + Playwright
  6. Register MCP servers (GitHub, Playwright, optionally AzDo, Notion)
  7. Link skills + scripts
  8. Fetch context (PR details, issue details, AzDo work items, Slack threads)
  9. Compose prompt + run Claude Code
  10. Save persistent context + transcript
  11. Upload artifacts
  12. Post response to source
  13. Job summary + cancellation handling

- **`resume/action.yml`**: Watches for CI completion via `workflow_run` event, checks labels, dispatches `po-agent-resume` repository_dispatch event.

## Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `anthropic_api_key` | Yes | — | API key (or dummy if using proxy) |
| `max_budget_usd` | No | `5.0` | Max spend per session |
| `model` | No | `claude-sonnet-4-20250514` | Default model |
| `anthropic_base_url` | No | — | Custom API base URL (proxy support) |
| `timeout_minutes` | No | `0` | Timeout awareness |
| `dry_run` | No | `false` | Investigation only, no code changes |
| `investigation_model` | No | — | Model for read-only tasks |
| `implementation_model` | No | — | Model for code-writing tasks |
| `trigger_word` | No | `@po-agent` | Keyword to invoke agent |
| `secrets` | No | — | KEY=VALUE pairs as env vars |

## Skills System

Skills are markdown files (`SKILL.md`) with frontmatter, linked into `.claude/skills/` at runtime.

- **Built-in skills** (10 + rfs-proposal): `skills/` directory
- **Consumer overrides**: `.po-agent/skills/<name>/` overrides built-in skill of same name
- **Consumer extensions**: `.po-agent/skills/<name>/` for project-specific skills

### Validation

```bash
bash scripts/validate-skill.sh skills/bug-fix-workflow/
bash scripts/validate-all-skills.sh
```

## Label System

Labels on PRs control the auto-resume flow:
- `po-agent:waiting-ci` — waiting for CI
- `po-agent:waiting-human` — waiting for human input (`<!-- WAITING_FOR_HUMAN -->`)
- `po-agent:in-progress` — agent is running
- `po-agent:attempt-N` — tracks resume attempts
- `po-agent:failed` — max attempts exceeded

## RFS (Request for Skills)

The agent auto-detects skill gaps and files structured GitHub Issues with `rfs` + `rfs:proposed` labels. See `docs/rfs.md` for the full lifecycle.

## Testing

- Validate YAML: `python3 -c "import yaml; yaml.safe_load(open('action.yml'))"`
- Validate skills: `bash scripts/validate-all-skills.sh`
- Test in a consumer repo: point workflow at `Adrian62D/po-agent@main`

## Development Guidelines

- All shell code is in `action.yml` steps — there's no separate build step
- Use `|| true` after grep/commands that may return non-zero in `set -e` contexts
- Test YAML validity after every edit to action.yml
- MCP servers are registered at runtime, not bundled
- Prompts are composed from `core.md` + `source-*.md` + context + user message
- The `stream-json` output format is parsed for `"type":"result"` lines
