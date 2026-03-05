---
name: validate-action-yml
description: Validate the action.yml composite action after modifications. Checks YAML syntax, inputs/outputs, step structure.
disable-model-invocation: true
---

# Validate action.yml

Run this skill after modifying `action.yml` to ensure the file is structurally valid.

## Step 1: YAML Syntax Check

```bash
python3 -c "import yaml; yaml.safe_load(open('action.yml'))" && echo '✅ YAML valid' || echo '❌ YAML invalid'
```

## Step 2: Structure Validation

```bash
python3 -c "
import yaml
with open('action.yml') as f:
    data = yaml.safe_load(f)

# Check required top-level keys
assert 'name' in data, 'Missing: name'
assert 'inputs' in data, 'Missing: inputs'
assert 'outputs' in data, 'Missing: outputs'
assert 'runs' in data, 'Missing: runs'
assert data['runs']['using'] == 'composite', 'Not a composite action'

# Check required inputs
required_inputs = ['anthropic_api_key']
for inp in required_inputs:
    assert inp in data['inputs'], f'Missing required input: {inp}'

# Check outputs
assert 'response' in data['outputs'], 'Missing output: response'
assert 'cost_usd' in data['outputs'], 'Missing output: cost_usd'

# Count steps
steps = data['runs']['steps']
print(f'✅ All checks passed ({len(steps)} steps, {len(data[\"inputs\"])} inputs)')
"
```

## Step 3: Check for Common Issues

- Ensure all `jq` calls have `2>/dev/null` or `|| true` for error handling
- Ensure all `grep -oP` calls have `|| true` to handle no-match exit code 1
- Ensure `GITHUB_OUTPUT` writes don't contain unescaped newlines in values
- Ensure all step IDs referenced in `steps.*.outputs.*` actually exist

## Step 4: Verify Skills Still Pass

```bash
bash scripts/validate-all-skills.sh
```

## When to Use

- After ANY edit to `action.yml`
- After merging upstream changes
- Before committing action.yml changes
