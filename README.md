<p align="center">
  <strong><span style="font-size:3em;">PO Agent</span></strong>
</p>

<h1 align="center">PO Agent</h1>

<p align="center">
  An AI Product Owner that lives in your GitHub repo. It investigates, implements, tests, and delivers — autonomously.
</p>

<p align="center">
  <a href="docs/quickstart.md">Quickstart</a>&nbsp; · &nbsp;
  <a href="docs/writing-skills.md">Write a Skill</a>&nbsp; · &nbsp;
  <a href="docs/architecture.md">Architecture</a>&nbsp; · &nbsp;
  <a href="docs/rfs.md">RFS</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/runtime-GitHub%20Actions-2088FF?logo=github-actions&logoColor=white" alt="GitHub Actions">
  <img src="https://img.shields.io/badge/engine-Claude%20Code-CC785C?logo=anthropic&logoColor=white" alt="Claude Code">
  <img src="https://img.shields.io/badge/skills-markdown-000000?logo=markdown&logoColor=white" alt="Markdown Skills">
  <img src="https://img.shields.io/badge/license-MIT-green" alt="MIT License">
</p>

---

## Why We Built This

We want to **enable every organisation to have a 24/7 dev factory.**

Software doesn't sleep, and neither should your development pipeline. Whether you're a solo founder or a small team — you deserve autonomous machinery that investigates, implements, tests, and delivers around the clock. Not a copilot that waits for you to type. A teammate that picks up work, finishes it, and asks for review.

Let's build, build, build.

---

## Philosophy

**Think first, code second.** The agent doesn't jump to implementation. It investigates the problem, assesses its confidence, and confirms scope before writing a single line. Mandatory gates enforce this discipline — every time.

**Skills over configuration.** No YAML schemas, no DSLs, no plugin APIs. Skills are plain markdown files that describe workflows in human language. If you can write a README, you can teach the agent a new workflow.

**Your repo, your rules.** Override any built-in skill by dropping a markdown file in `.po-agent/skills/`. The agent adapts to your stack, your conventions, your quality bar. Framework defaults are just starting points.

**Transparent by default.** Every run posts its reasoning, cost, and a link to the workflow log. No black boxes. You see what the agent did, why, and what it cost.

**Runs where your code runs.** No external SaaS. No third-party access to your codebase. PO Agent runs inside GitHub Actions on your infrastructure. Your code never leaves your CI environment.

**Autonomous but interruptible.** The agent handles the full loop — implementation, CI, review, resume — without intervention. But it stops and asks when confidence is low, scope is unclear, or a human decision is needed.

**Budget-aware.** Every session tracks cost. Set a cap per run and the agent optimises to stay within it. No surprise bills.

---

## Try It with Claude Code

Open Claude Code and paste one of these prompts:

**I already have a repo:**

```
Install PO Agent on my repo <your-repo-url>, then open an issue:
"@po-agent add a /health endpoint that returns the app version from package.json, with a test"
```

**Start from scratch:**

```
Set up PO Agent on a new repo with a React + Vite starter. Once it's running,
comment on an issue: "@po-agent add dark mode support using CSS custom properties.
Include a toggle button in the header."
```

---

## Quick Start

### 1. Add the workflow

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

**Settings → Secrets → Actions** → add `ANTHROPIC_API_KEY`.

### 3. Talk to it

Comment on any PR:

```
@po-agent fix this failing test
```

The agent investigates the failure, implements a fix, pushes, and waits for CI. Done.

---

## How It Works

```
You comment on a PR           The agent runs in Actions             You get a result
┌───────────────────┐         ┌─────────────────────────┐          ┌───────────────────┐
│ @po-agent fix     │────────▶│  1. Investigate          │────────▶│  Fixed in abc123.  │
│ this bug          │         │  2. Implement            │         │  CI passed. ✅     │
│                   │         │  3. Push + wait for CI   │         │                   │
│                   │         │  4. Handle review        │         │  Cost: ~$0.42     │
└───────────────────┘         └─────────────────────────┘          └───────────────────┘
```

It thinks like a Product Owner first — understanding the problem — then acts like a Senior Developer — writing clean code with tests.

---

## Skills

Everything is customised through **skills**: markdown files in `.po-agent/skills/`.

### Built-in skills

| Skill | What it does |
|-------|-------------|
| `/mandatory-gates` | Investigation, confidence check, scope confirmation — before any code |
| `/bug-fix-workflow` | 9-phase bug fix: investigate → implement → CI → review → verify |
| `/story-workflow` | 9-phase feature implementation |
| `/code-quality` | Pre-push validation (lint, format, typecheck) |
| `/pr-creation` | Create PRs with proper format and context |
| `/review-handling` | Process AI and human review comments |
| `/merge-conflicts` | Resolve conflicts via rebase |
| `/ci-wait-resume` | Wait for CI inline or via auto-resume |
| `/budget-management` | Session cost tracking and optimisation |
| `/playwright-verify` | Browser verification with Playwright MCP |
| `/rfs-proposal` | File a Request for Skill when a skill gap is detected |

### Override a built-in skill

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

Your version wins. The framework default is skipped.

### Add your own skills

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
```

### Priority

| Source | What happens |
|--------|-------------|
| `.po-agent/skills/code-quality/` | **Overrides** the built-in |
| `.po-agent/skills/db-access/` | **Added** as a new skill |
| `skills/code-quality/` (built-in) | Skipped if overridden |

---

## Auto-Resume

The agent automatically picks up where it left off when CI completes:

```yaml
# .github/workflows/po-agent-resume.yml
name: PO Agent Resume
on:
  workflow_run:
    workflows: ["CI"]
    types: [completed]
jobs:
  resume:
    runs-on: ubuntu-latest
    steps:
      - uses: vyzn-tech/po-agent/resume@v1
        with:
          github_token: ${{ github.token }}
```

Labels track state: `po-agent:waiting-ci`, `po-agent:in-progress`, `po-agent:attempt-N`.

---

## Triggers

PO Agent works from multiple sources:

| Source | How |
|--------|-----|
| **PR comment** | `@po-agent fix this bug` |
| **Issue comment** | `@po-agent implement this feature` |
| **Slack** | Deploy the [webhook relay](webhooks/slack/), mention the agent |
| **Azure DevOps** | Deploy the [AzDo relay](webhooks/azure-devops/) |
| **Any webhook** | Send a `repository_dispatch` with your payload |
| **Manual** | `workflow_dispatch` with a message |
| **Auto-resume** | Triggered automatically after CI |

### Full workflow (all triggers)

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
  issues: write
  actions: write
concurrency:
  group: po-agent-${{ github.event.issue.number || github.event.client_payload.pr_number || github.run_id }}
  cancel-in-progress: false
jobs:
  agent:
    if: |
      github.event_name != 'issue_comment' ||
      contains(github.event.comment.body, '@po-agent')
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
```

---

## Configuration

### Action inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `anthropic_api_key` | Yes | — | Anthropic API key (or dummy if using a proxy) |
| `anthropic_base_url` | No | — | Custom API base URL for proxies |
| `max_budget_usd` | No | `5.0` | Max spend per session |
| `model` | No | `claude-sonnet-4-20250514` | Claude model |
| `investigation_model` | No | — | Model for read-only investigation phases |
| `implementation_model` | No | — | Model for code-writing phases |
| `trigger_word` | No | `@po-agent` | Keyword that invokes the agent |
| `timeout_minutes` | No | `0` | Timeout awareness for the agent |
| `dry_run` | No | `false` | Stop after investigation, no code changes |
| `secrets` | No | — | `KEY=VALUE` pairs, exported as env vars |
| `github_token` | No | `github.token` | GitHub token for API calls |

### Resume inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `github_token` | No | `github.token` | GitHub token |
| `max_attempts` | No | `10` | Max resume attempts per PR |
| `required_workflows` | No | — | Comma-separated workflow names to wait for |

---

## Architecture

```
.po-agent/skills/           ← Your skills (overrides + extensions)
    code-quality/SKILL.md
    db-access/SKILL.md

vyzn-tech/po-agent          ← This framework
├── action.yml              ← Composite action (detect, setup, run, respond)
├── resume/action.yml       ← Resume sub-action
├── skills/                 ← Built-in skills
├── prompts/                ← System prompt fragments
├── scripts/                ← Shell utilities
└── webhooks/               ← Webhook relay functions
```

At runtime:
1. Detect source from `$GITHUB_EVENT_PATH` (PR, issue, Slack, webhook, resume)
2. Link `.po-agent/skills/` into Claude Code — your skills override defaults
3. Compose system prompt: `core.md` + source-specific fragment + context
4. Run Claude Code with your `CLAUDE.md` as project context
5. Post the response back to source (PR comment, Slack message, etc.)

---

## RFS (Request for Skills)

When the agent encounters a task it can't handle well, it automatically files a structured GitHub Issue proposing a new skill. These are tagged `rfs` + `rfs:proposed` and follow a standard template. See [docs/rfs.md](docs/rfs.md).

**Don't add features. Add skills.** Instead of bloating the core, contributors submit skill files that teach the agent new workflows.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

Skills contributions are especially welcome. If you've built a useful skill, submit a PR.

---

## License

MIT — see [LICENSE](LICENSE).

Built by [vyzn](https://vyzn.tech). Battle-tested on a production platform for planning sustainable buildings.
