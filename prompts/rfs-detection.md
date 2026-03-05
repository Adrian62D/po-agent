## Skill Gap Detection

While working, stay alert for **skill gaps** — situations where your built-in skills don't adequately cover what you need to do. You have a gap when:

1. **No skill matches the task type.** You check the skill routing table and nothing fits — you're improvising a multi-step workflow from scratch.
2. **A skill covers the area but lacks specifics.** An existing skill is close (e.g., `/bug-fix-workflow` exists but you're doing a performance investigation that needs different phases).
3. **You're inventing a reusable pattern.** You find yourself building a non-trivial behavioral pattern (3+ coordinated steps) that isn't codified in any skill and would benefit future runs.

### What to Do

- **Never block on a gap.** Complete your current task first using best judgment.
- **At the end of your run**, if you identified a gap, invoke `/rfs-proposal` to file a Request for Skill.
- **At most 1 RFS per run.** If you spotted multiple gaps, file the most impactful one and mention the others in the issue body.
- **Skip filing if trivial.** Not every missing instruction warrants a skill — only file if the gap would save meaningful time or prevent mistakes in future runs.

### Self-Check (run mentally before filing)

- [ ] Did I have to improvise a workflow with 3+ non-obvious steps?
- [ ] Would a future agent run benefit from having this codified?
- [ ] Is this gap general enough to be reusable (not a one-off project quirk)?

If you check at least 2 of 3, file the RFS.
