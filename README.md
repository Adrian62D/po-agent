# PO Agent

**Add an AI Product Owner to your repo in 14 lines of YAML.**

Comment `@po-agent fix this bug` on a PR. It investigates, implements, pushes, waits for CI, handles review comments, and validates — all autonomously.

Customize everything with markdown files in `.po-agent/skills/`. No config schemas. No DSLs. Just markdown.

---

## Why I Built This

My motivation is simple: **enable every organisation to have a 24/7 dev factory.** Software doesn't sleep, and neither should your development pipeline. Whether you're a solo founder, a small team, or a large enterprise — PO Agent gives you an autonomous developer that investigates, implements, tests, and delivers around the clock.

Let's build, build, build.

---

## Principles

**Think first, code second.** The agent doesn't jump straight to implementation. It investigates the problem, assesses confidence, and confirms scope before writing a single line. Mandatory gates enforce this discipline — every time.

**Skills over configuration.** No YAML schemas, no DSLs, no plugin APIs. Skills are plain markdown files that describe workflows in human language. If you can write a README, you can teach the agent a new workflow.

**Your repo, your rules.** Override any built-in skill by dropping a markdown file in `.po-agent/skills/`. The agent adapts to your stack, your conventions, your quality bar. Framework defaults are just sensible starting points.

**Transparent by default.** Every run posts its reasoning, cost, and a link to the workflow log. No black boxes. You see exactly what the agent did, why it did it, and what it cost.

**Runs where your code runs.** No external SaaS, no third-party access to your codebase. PO Agent runs inside GitHub Actions on your own runners. Your code never leaves your CI environment.

**Autonomous but interruptible.** The agent handles the full loop — implementation, CI, review, resume — without human intervention. But it stops and asks when confidence is low, scope is unclear, or a human decision is needed.

**Budget-aware.** Every session tracks cost. Set a budget cap per run, and the agent will optimise its approach to stay within it. No surprise bills.

---

## Quick Start (2 minutes)

### 1. Copy this workflow to your repo

```yaml
# .github/workflows/po-agent.yml
name: PO Agent
on:
  issue_comment:
    types: [created]
permissions:
  contents: write
  pull-requests: write
jobs:
  agent:
    if: github.event.issue.pull_request && contains(github.event.comment.body, '@po-agent')
    runs-on: ubuntu-latest
    timeout-minutes: 60
    steps:
      - uses: actions/checkout@v4
      - uses: vyzn-tech/po-agent@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
```

### 2. Add your API key

Go to **Settings → Secrets → Actions** and add `ANTHROPIC_API_KEY`.

### 3. Use it

Comment on any PR:

```
@po-agent fix this failing test
```

The agent will investigate the failure, implement a fix, push it, and wait for CI.

---

## How It Works

```
You comment on a PR          The agent runs in GitHub Actions          You get a response
┌──────────────────┐         ┌──────────────────────────┐            ┌──────────────────┐
│ @po-agent fix    │────────▶│ 1. Investigate           │───────────▶│ Fixed in abc123.  │
│ this bug         │         │ 2. Implement fix         │            │ CI passed. ✅     │
│                  │         │ 3. Push + wait for CI    │            │                  │
│                  │         │ 4. Handle review comments│            │ Cost: ~$0.42     │
└──────────────────┘         └──────────────────────────┘            └──────────────────┘
```

The agent uses Claude Code with a battle-tested set of workflow skills. It thinks like a Product Owner first (understanding the user's problem) and then acts like a Senior Developer (writing clean code with tests).

---

## Customization

Everything is customized through **skills** — markdown files in `.po-agent/skills/` in your repo.

### Override a built-in skill

The agent ships with generic defaults for code quality, PR creation, etc. Override any of them:

```markdown
<!-- .po-agent/skills/code-quality/SKILL.md -->
---
name: code-quality
description: Run pre-push validation. MANDATORY before every git push.
allowed-tools: Bash
---

# Code Quality

Before every push, run:

\`\`\`bash
npm run lint:fix && npm run format:write && npm run typecheck
\`\`\`
```

### Add project-specific skills

```markdown
<!-- .po-agent/skills/db-access/SKILL.md -->
---
name: db-access
description: Query the project database for investigation.
allowed-tools: Bash
---

# Database Access

Connect to the dev database:

\`\`\`bash
mysql -h $DB_HOST -u $DB_USER -p$DB_PASSWORD myapp_dev
\`\`\`

Credentials are available via environment variables (passed via `secrets` input).
```

### Skill override priority

| Source | Priority |
|--------|----------|
| Your `.po-agent/skills/code-quality/` | **Wins** (override) |
| Framework `skills/code-quality/` | Skipped |
| Your `.po-agent/skills/db-access/` | **Added** (extension) |

---

## Built-in Skills

| Skill | Description |
|-------|-------------|
| `/mandatory-gates` | Pre-implementation gates: investigation, confidence assessment, scope confirmation |
| `/bug-fix-workflow` | 9-phase bug fix: investigate → implement → CI → review → verify |
| `/story-workflow` | 9-phase feature implementation |
| `/code-quality` | Pre-push validation (lint, format, typecheck) |
| `/pr-creation` | Create PRs with proper format |
| `/review-handling` | Process AI and human review comments |
| `/merge-conflicts` | Resolve merge conflicts via rebase |
| `/ci-wait-resume` | Wait for CI checks inline or via auto-resume |
| `/budget-management` | Session cost tracking and optimization |
| `/playwright-verify` | Browser verification with Playwright |

---

## Auto-Resume

The agent can automatically resume when CI completes. Add the resume workflow:

```yaml
# .github/workflows/po-agent-resume.yml
name: PO Agent Resume
on:
  workflow_run:
    workflows: ["CI"]    # Your CI workflow name(s)
    types: [completed]
jobs:
  resume:
    runs-on: ubuntu-latest
    steps:
      - uses: vyzn-tech/po-agent/resume@v1
        with:
          github_token: ${{ github.token }}
```

---

## Additional Triggers

### Slack

Deploy the [Slack webhook relay](webhooks/slack/) and add `repository_dispatch` to your workflow triggers:

```yaml
on:
  issue_comment:
    types: [created]
  repository_dispatch:
```

Pass the Slack bot token via secrets:

```yaml
- uses: vyzn-tech/po-agent@v1
  with:
    anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
    secrets: |
      SLACK_BOT_TOKEN=${{ secrets.SLACK_BOT_TOKEN }}
```

### Any Webhook Source

The agent accepts any `repository_dispatch` event. The `client_payload` is passed through as context. See [webhooks/README.md](webhooks/README.md) for details.

---

## Full Workflow Example

For all triggers (GitHub + Slack + any webhook + manual + auto-resume):

```yaml
name: PO Agent
on:
  issue_comment:
    types: [created]
  repository_dispatch:
  workflow_dispatch:
    inputs:
      message: { description: 'Message', required: true }
permissions:
  contents: write
  pull-requests: write
  actions: write
concurrency:
  group: po-agent-${{ github.event.issue.number || github.event.client_payload.pr_number || github.event.client_payload.work_item_id || github.run_id }}
  cancel-in-progress: false
jobs:
  agent:
    if: |
      github.event_name != 'issue_comment' ||
      (github.event.issue.pull_request && contains(github.event.comment.body, '@po-agent'))
    runs-on: ubuntu-latest
    timeout-minutes: 120
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: vyzn-tech/po-agent@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          max_budget_usd: '10.0'
          secrets: |
            SLACK_BOT_TOKEN=${{ secrets.SLACK_BOT_TOKEN }}
            AZURE_DEVOPS_PAT=${{ secrets.AZURE_DEVOPS_PAT }}
```

---

## Configuration Reference

### Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `anthropic_api_key` | Yes | — | Anthropic API key |
| `max_budget_usd` | No | `5.0` | Max spend per session |
| `model` | No | `claude-sonnet-4-20250514` | Claude model |
| `trigger_word` | No | `@po-agent` | Word that triggers the agent |
| `secrets` | No | — | Newline-separated `KEY=VALUE` pairs, exported as env vars |
| `github_token` | No | `github.token` | GitHub token for comments/reactions |

### Resume Action Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github_token` | No | `github.token` | GitHub token |
| `max_attempts` | No | `10` | Max resume attempts per PR |
| `required_workflows` | No | — | Comma-separated workflow names to wait for |
| `secrets` | No | — | Newline-separated `KEY=VALUE` pairs |

---

## Architecture

```
.po-agent/skills/          ← Your skills (overrides + extensions)
    code-quality/SKILL.md
    pr-creation/SKILL.md
    db-access/SKILL.md

vyzn-tech/po-agent         ← This framework
├── action.yml             ← Composite action (source detection, setup, run, respond)
├── resume/action.yml      ← Resume sub-action
├── skills/                ← Built-in default skills
├── prompts/               ← System prompt fragments
├── scripts/               ← Shell utilities (wait-for-checks, etc.)
└── webhooks/              ← Webhook relay functions
```

At runtime, the action:
1. Reads `$GITHUB_EVENT_PATH` to detect source and extract context
2. Links your `.po-agent/skills/` into Claude Code's skill discovery (your skills override framework defaults)
3. Composes a system prompt from `prompts/core.md` + source-specific fragment
4. Runs Claude Code with your `CLAUDE.md` as project context
5. Posts the response back to the source (GitHub PR comment, Slack message, etc.)

---

## Comparison

| Feature | GitHub Copilot | Cursor | Devin | **PO Agent** |
|---------|---------------|--------|-------|-------------|
| Triggered from PRs | ✅ | ❌ | ❌ | ✅ |
| Triggered from Slack | ❌ | ❌ | ❌ | ✅ |
| Triggered from any webhook | ❌ | ❌ | ❌ | ✅ |
| Auto-resumes after CI | ❌ | ❌ | ⚠️ | ✅ |
| Browser verification | ❌ | ❌ | ⚠️ | ✅ (Playwright) |
| Budget management | ❌ | ❌ | ❌ | ✅ |
| Customizable workflows | ❌ | Limited | ❌ | ✅ (skills) |
| Open source | ❌ | ❌ | ❌ | ✅ |
| Runs on your own CI | ❌ | ❌ | ❌ | ✅ |

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Skills contributions are especially welcome! If you've written a useful skill, please submit a PR.

---

## License

MIT — see [LICENSE](LICENSE).

Built by [vyzn](https://vyzn.tech). Battle-tested on a production platform for planning sustainable buildings.
