---
name: test-skills
description: Run the skill validation framework against all built-in and consumer skills.
disable-model-invocation: true
---

# Test Skills

Run this skill to validate that all skill definitions are correctly structured.

## Step 1: Validate Built-in Skills

```bash
bash scripts/validate-all-skills.sh skills/
```

All 11 built-in skills (including `rfs-proposal`) must pass with 0 errors.

## Step 2: Validate Consumer Skills (if any)

```bash
if [ -d .po-agent/skills ]; then
  bash scripts/validate-all-skills.sh .po-agent/skills/
else
  echo "No consumer skills found"
fi
```

## Step 3: Check Skill Routing Table

Verify that every skill in `skills/` has a corresponding entry in `prompts/core.md`:

```bash
for skill_dir in skills/*/; do
  skill_name=$(basename "$skill_dir")
  if grep -q "/$skill_name" prompts/core.md; then
    echo "✅ $skill_name — listed in core.md"
  else
    echo "⚠️ $skill_name — NOT in core.md routing table"
  fi
done
```

## Step 4: Check for Orphaned Skill References

Verify that every skill referenced in `prompts/core.md` has an actual directory:

```bash
grep -oP '/[a-z][-a-z]+' prompts/core.md | sort -u | while read -r skill_ref; do
  skill_name="${skill_ref#/}"
  if [ -d "skills/$skill_name" ] || [ -d ".po-agent/skills/$skill_name" ]; then
    echo "✅ $skill_ref — exists"
  else
    echo "❌ $skill_ref — referenced but not found"
  fi
done
```

## When to Use

- After adding, modifying, or removing a skill
- After modifying `prompts/core.md`
- Before releasing a new version
